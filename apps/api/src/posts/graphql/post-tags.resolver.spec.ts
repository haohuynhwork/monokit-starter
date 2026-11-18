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
import { builtInPermissions } from "../../users/domain/permissions.js";
import { DeletePostTagCommand } from "../application/commands/delete-post-tag.command.js";
import { RenamePostTagCommand } from "../application/commands/rename-post-tag.command.js";
import { ListPostTagsQuery } from "../application/queries/list-post-tags.query.js";
import { PostTagsResolver } from "./post-tags.resolver.js";

const actor = {
  id: 1n,
  permissions: builtInPermissions("editor"),
};

describe("PostTagsResolver", () => {
  let app: INestApplication;
  const commands = vi.fn();
  const queries = vi.fn();

  beforeEach(async () => {
    commands.mockReset();
    queries.mockReset();
    const moduleRef = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>(graphqlConfig),
      ],
      providers: [
        PostTagsResolver,
        {
          provide: CommandBus,
          useValue: {
            execute: commands,
          },
        },
        {
          provide: QueryBus,
          useValue: {
            execute: queries,
          },
        },
        {
          provide: TOKEN_SERVICE,
          useValue: {
            verifyAccess: async () => ({
              userId: 1n,
              role: "editor",
              sessionId: 9n,
            }),
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

  const gql = (query: string, variables?: object, token = "t") => {
    const req = request(app.getHttpServer()).post("/graphql");
    if (token) {
      req.set("Authorization", `Bearer ${token}`);
    }
    return req.send({
      query,
      variables,
    });
  };

  it("lists every tag with ids", async () => {
    queries.mockResolvedValue([
      {
        id: "2",
        name: "News",
        slug: "news",
        postCount: 0,
      },
    ]);
    const res = await gql('{ adminPostTags(q: "ne") { id name postCount } }');
    expect(res.body).toEqual({
      data: {
        adminPostTags: [
          {
            id: "2",
            name: "News",
            postCount: 0,
          },
        ],
      },
    });
    expect(queries).toHaveBeenCalledWith(
      new ListPostTagsQuery({
        live: false,
        q: "ne",
      }),
    );
  });

  it("renames and deletes a tag", async () => {
    let res = await gql('mutation { renamePostTag(id: "2", name: "Updates") }');
    expect(res.body).toEqual({
      data: {
        renamePostTag: true,
      },
    });
    expect(commands).toHaveBeenCalledWith(
      new RenamePostTagCommand(2n, "Updates", actor),
    );
    res = await gql('mutation { deletePostTag(id: "2") }');
    expect(res.body.data.deletePostTag).toBe(true);
    expect(commands).toHaveBeenCalledWith(new DeletePostTagCommand(2n, actor));
  });

  it("validates the new name", async () => {
    const res = await gql(
      `mutation { renamePostTag(id: "2", name: "${"x".repeat(101)}") }`,
    );
    expect(res.body.errors[0].extensions.code).toBe("validation_failed");
    expect(commands).not.toHaveBeenCalled();
  });

  it("needs a signed-in user", async () => {
    const res = await gql("{ adminPostTags { id } }", undefined, "");
    expect(res.body.errors[0].extensions.status).toBe(401);
    expect(queries).not.toHaveBeenCalled();
  });
});
