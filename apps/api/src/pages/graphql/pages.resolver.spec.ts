import { type ApolloDriverConfig } from "@nestjs/apollo";
import type { INestApplication } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { GraphQLModule } from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { TOKEN_SERVICE } from "../../auth/domain/tokens.js";
import { AuthGuard } from "../../auth/http/auth.guard.js";
import { PermissionResolver } from "../../auth/http/permission-resolver.js";
import { testPermissionResolver } from "../../auth/http/permission-resolver.testing.js";
import { graphqlConfig } from "../../common/graphql/graphql.config.js";
import { ApiExceptionFilter } from "../../common/http/responses/api-exception.filter.js";
import { ResponseInterceptor } from "../../common/http/responses/response.interceptor.js";
import { CreatePageCommand } from "../application/commands/create-page.command.js";
import { CreatePageLayoutCommand } from "../application/commands/create-page-layout.command.js";
import { DeletePageCommand } from "../application/commands/delete-page.command.js";
import { UpdatePageCommand } from "../application/commands/update-page.command.js";
import { GetPageQuery } from "../application/queries/get-page.query.js";
import type {
  PageLayoutView,
  PageView,
} from "../application/queries/page.view.js";
import { PageLayoutsResolver } from "./page-layouts.resolver.js";
import { PagesResolver } from "./pages.resolver.js";

const page: PageView = {
  id: "7",
  parentId: null,
  layoutId: "2",
  title: "About",
  slug: "about",
  path: "about",
  status: "draft",
  publishedAt: null,
  live: false,
  showInMenu: true,
  menuOrder: 0,
  updatedAt: "2026-10-01T00:00:00.000Z",
  description: null,
  settings: {
    blocks: [],
  },
  createdAt: "2026-10-01T00:00:00.000Z",
};

const layout: PageLayoutView = {
  id: "2",
  name: "Main",
  isDefault: true,
  settings: {} as PageLayoutView["settings"],
  pageCount: 1,
  updatedAt: "2026-10-01T00:00:00.000Z",
};

describe("PagesResolver / PageLayoutsResolver", () => {
  let app: INestApplication;
  const query = vi.fn();
  const command = vi.fn();
  const verifyAccess = vi.fn();

  beforeEach(async () => {
    query.mockReset();
    command.mockReset();
    verifyAccess.mockReset().mockResolvedValue({
      userId: 1n,
      role: "editor",
      sessionId: 1n,
    });
    const moduleRef = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>(graphqlConfig),
      ],
      providers: [
        PagesResolver,
        PageLayoutsResolver,
        {
          provide: QueryBus,
          useValue: {
            execute: query,
          },
        },
        {
          provide: CommandBus,
          useValue: {
            execute: command,
          },
        },
        {
          provide: TOKEN_SERVICE,
          useValue: {
            verifyAccess,
          },
        },
        {
          provide: PermissionResolver,
          useValue: testPermissionResolver,
        },
        {
          provide: APP_GUARD,
          useClass: AuthGuard,
        },
        {
          provide: APP_FILTER,
          useClass: ApiExceptionFilter,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: ResponseInterceptor,
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(() => app.close());

  const gql = (q: string, variables?: object, token: string | null = "t") => {
    const req = request(app.getHttpServer()).post("/graphql");
    if (token) {
      req.set("Authorization", `Bearer ${token}`);
    }
    return req.send({
      query: q,
      variables,
    });
  };

  it("gets a page by id", async () => {
    query.mockResolvedValue(page);
    const res = await gql('{ page(id: "7") { id title settings live } }');
    expect(res.body).toEqual({
      data: {
        page: {
          id: "7",
          title: "About",
          settings: {
            blocks: [],
          },
          live: false,
        },
      },
    });
    expect(query).toHaveBeenCalledWith(new GetPageQuery(7n));
  });

  it("reports a missing page as not found", async () => {
    query.mockResolvedValue(null);
    const res = await gql('{ page(id: "7") { id } }');
    expect(res.body.errors[0].extensions.status).toBe(404);
  });

  it("creates a page as the current user", async () => {
    command.mockResolvedValue(7n);
    query.mockResolvedValue(page);
    const res = await gql(
      'mutation { createPage(input: { title: "About", layoutId: "2" }) { id } }',
    );
    expect(res.body).toEqual({
      data: {
        createPage: {
          id: "7",
        },
      },
    });
    expect(command).toHaveBeenCalledWith(
      new CreatePageCommand("About", null, 2n, 1n),
    );
  });

  it("maps layoutId on update", async () => {
    query.mockResolvedValue(page);
    await gql(
      'mutation { updatePage(id: "7", input: { layoutId: null, showInMenu: false }) { id } }',
    );
    expect(command).toHaveBeenCalledWith(
      new UpdatePageCommand(7n, {
        showInMenu: false,
        layoutId: null,
      }),
    );
  });

  it("deletes a page", async () => {
    const res = await gql('mutation { deletePage(id: "7") }');
    expect(res.body).toEqual({
      data: {
        deletePage: true,
      },
    });
    expect(command).toHaveBeenCalledWith(new DeletePageCommand(7n));
  });

  it("validates input with the REST schema", async () => {
    const res = await gql(
      'mutation { createPage(input: { title: "x", parentId: "abc" }) { id } }',
    );
    expect(res.body.errors[0].extensions).toMatchObject({
      code: "validation_failed",
      status: 400,
    });
    expect(command).not.toHaveBeenCalled();
  });

  it("refuses users who are not staff", async () => {
    verifyAccess.mockResolvedValue({
      userId: 1n,
      role: "user",
      sessionId: 1n,
    });
    const res = await gql("{ pages { id } }");
    expect(res.body.errors[0].extensions.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it("refuses anonymous requests", async () => {
    const res = await gql("{ pageLayouts { id } }", undefined, null);
    expect(res.body.errors[0].extensions.status).toBe(401);
  });

  it("creates a layout and reads it back", async () => {
    command.mockResolvedValue(2n);
    query.mockResolvedValue([
      layout,
    ]);
    const res = await gql(
      'mutation { createPageLayout(input: { name: "Main" }) { id isDefault pageCount } }',
    );
    expect(res.body).toEqual({
      data: {
        createPageLayout: {
          id: "2",
          isDefault: true,
          pageCount: 1,
        },
      },
    });
    expect(command).toHaveBeenCalledWith(
      new CreatePageLayoutCommand("Main", {}),
    );
  });
});
