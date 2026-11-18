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
import { DeletePostCommand } from "../application/commands/delete-post.command.js";
import { PublishPostCommand } from "../application/commands/publish-post.command.js";
import { UpdatePostCommand } from "../application/commands/update-post.command.js";
import { GetPostQuery } from "../application/queries/get-post.query.js";
import { ListPostsQuery } from "../application/queries/list-posts.query.js";
import type { PostView } from "../application/queries/post.view.js";
import { PostsResolver } from "./posts.resolver.js";

const post: PostView = {
  id: "7",
  parentId: null,
  authorId: "1",
  title: "Hello",
  slug: "hello",
  path: "hello",
  content: "<p>Hi</p>",
  description: null,
  tags: [],
  status: "draft",
  publishedAt: null,
  live: false,
  cover: {
    assetId: "3",
    url: "/files/c.jpg",
  },
  translations: [],
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};
const actor = {
  id: 1n,
  permissions: builtInPermissions("editor"),
};

describe("PostsResolver", () => {
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
        PostsResolver,
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

  it("lists posts as a page", async () => {
    queries.mockResolvedValue({
      items: [
        post,
      ],
      total: 1,
    });
    const res = await gql(
      '{ adminPosts(status: "draft", limit: 5) { items { id title live } meta { total limit offset } } }',
    );
    expect(res.body).toEqual({
      data: {
        adminPosts: {
          items: [
            {
              id: "7",
              title: "Hello",
              live: false,
            },
          ],
          meta: {
            total: 1,
            limit: 5,
            offset: 0,
          },
        },
      },
    });
    expect(queries).toHaveBeenCalledWith(
      new ListPostsQuery(
        {
          status: "draft",
        },
        5,
        0,
      ),
    );
  });

  it("updates a post and returns it", async () => {
    queries.mockResolvedValue(post);
    const res = await gql(
      'mutation { updatePost(id: "7", input: { title: "New", description: null }) { id cover { url } } }',
    );
    expect(res.body).toEqual({
      data: {
        updatePost: {
          id: "7",
          cover: {
            url: "/files/c.jpg",
          },
        },
      },
    });
    expect(commands).toHaveBeenCalledWith(
      new UpdatePostCommand(
        7n,
        {
          title: "New",
          description: null,
        },
        expect.objectContaining(actor),
      ),
    );
    expect(queries).toHaveBeenCalledWith(new GetPostQuery(7n));
  });

  it("publishes at a time and deletes", async () => {
    queries.mockResolvedValue(post);
    await gql(
      'mutation { publishPost(id: "7", at: "2026-12-01T00:00:00Z") { id } }',
    );
    expect(commands).toHaveBeenCalledWith(
      new PublishPostCommand(
        7n,
        expect.objectContaining(actor),
        new Date("2026-12-01T00:00:00Z"),
      ),
    );
    const res = await gql('mutation { deletePost(id: "7") }');
    expect(res.body).toEqual({
      data: {
        deletePost: true,
      },
    });
    expect(commands).toHaveBeenCalledWith(
      new DeletePostCommand(7n, expect.objectContaining(actor)),
    );
  });

  it("reports a missing post as not found", async () => {
    queries.mockResolvedValue(null);
    const res = await gql('{ adminPost(id: "8") { id } }');
    expect(res.body.errors[0].extensions.status).toBe(404);
  });

  it("rejects bad ids and invalid input", async () => {
    let res = await gql('{ adminPost(id: "abc") { id } }');
    expect(res.body.errors[0].extensions.status).toBe(400);
    res = await gql('mutation { publishPost(id: "7", at: "tomorrow") { id } }');
    expect(res.body.errors[0].extensions.code).toBe("validation_failed");
    expect(commands).not.toHaveBeenCalled();
  });

  it("needs a signed-in user", async () => {
    const res = await gql("{ postOptions { id } }", undefined, "");
    expect(res.body.errors[0].extensions.status).toBe(401);
    expect(queries).not.toHaveBeenCalled();
  });
});
