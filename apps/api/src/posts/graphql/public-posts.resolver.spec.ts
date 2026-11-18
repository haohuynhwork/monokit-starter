import { type ApolloDriverConfig } from "@nestjs/apollo";
import type { INestApplication } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { QueryBus } from "@nestjs/cqrs";
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
import { GetPublicPostQuery } from "../application/queries/get-public-post.query.js";
import {
  CountPublicPostsQuery,
  ListPublicPostsQuery,
} from "../application/queries/list-public-posts.query.js";
import type { PublicPostView } from "../application/queries/post.view.js";
import { PublicPostsResolver } from "./public-posts.resolver.js";

const post: PublicPostView = {
  title: "Hello",
  path: "blog/hello",
  content: "<p>Hi</p>",
  description: null,
  tags: [
    {
      name: "News",
      slug: "news",
    },
  ],
  publishedAt: "2026-10-01T00:00:00.000Z",
  coverUrl: "/files/cover.jpg",
  locale: "en-US",
};

describe("PublicPostsResolver", () => {
  let app: INestApplication;
  const execute = vi.fn();

  beforeEach(async () => {
    execute.mockReset();
    const moduleRef = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>(graphqlConfig),
      ],
      providers: [
        PublicPostsResolver,
        {
          provide: QueryBus,
          useValue: {
            execute,
          },
        },
        {
          provide: TOKEN_SERVICE,
          useValue: {},
        },
        // The app's globals, to check they leave GraphQL in its own shape
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

  const gql = (query: string, variables?: object) =>
    request(app.getHttpServer()).post("/graphql").send({
      query,
      variables,
    });

  it("lists posts without the REST envelope", async () => {
    execute.mockResolvedValue([
      post,
    ]);
    const res = await gql(
      '{ posts(limit: 5, tag: "news") { title tags { slug } coverUrl } }',
    );
    expect(res.body).toEqual({
      data: {
        posts: [
          {
            title: "Hello",
            tags: [
              {
                slug: "news",
              },
            ],
            coverUrl: "/files/cover.jpg",
          },
        ],
      },
    });
    expect(execute).toHaveBeenCalledWith(
      new ListPublicPostsQuery(5, "news", undefined),
    );
  });

  it("pages posts with a total", async () => {
    execute.mockImplementation(async (q) =>
      q instanceof CountPublicPostsQuery
        ? 12
        : [
            post,
          ],
    );
    const res = await gql(
      '{ postPage(limit: 5, offset: 5, q: "hi") { items { title } meta { total limit offset } } }',
    );
    expect(res.body).toEqual({
      data: {
        postPage: {
          items: [
            {
              title: "Hello",
            },
          ],
          meta: {
            total: 12,
            limit: 5,
            offset: 5,
          },
        },
      },
    });
    expect(execute).toHaveBeenCalledWith(
      new ListPublicPostsQuery(5, undefined, undefined, "hi", 5, []),
    );
    expect(execute).toHaveBeenCalledWith(
      new CountPublicPostsQuery({
        tag: undefined,
        tagId: undefined,
        q: "hi",
      }),
    );
  });

  it("returns null for a missing post", async () => {
    execute.mockResolvedValue(null);
    const res = await gql("query ($p: String!) { post(path: $p) { title } }", {
      p: "nope",
    });
    expect(res.body).toEqual({
      data: {
        post: null,
      },
    });
    expect(execute).toHaveBeenCalledWith(new GetPublicPostQuery("nope"));
  });

  it("reports invalid arguments with the REST error code", async () => {
    const res = await gql("{ posts(limit: 500) { title } }");
    expect(res.body.errors[0]).toMatchObject({
      message: "Validation failed",
      extensions: {
        code: "validation_failed",
        status: 400,
        issues: [
          {
            path: "limit",
            message: expect.any(String),
          },
        ],
      },
    });
    expect(execute).not.toHaveBeenCalled();
  });
});
