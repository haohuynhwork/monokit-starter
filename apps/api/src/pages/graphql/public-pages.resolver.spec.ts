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
import { SendContactMessageCommand } from "../application/commands/send-contact-message.command.js";
import { GetPublicPageQuery } from "../application/queries/get-public-page.query.js";
import type { PublicPageView } from "../application/queries/page.view.js";
import { PublicPagesResolver } from "./public-pages.resolver.js";

const page = {
  id: "7",
  title: "About",
  path: "about",
  description: null,
  publishedAt: "2026-10-01T00:00:00.000Z",
  layout: {},
  options: {},
  blocks: [
    {
      id: "b1",
      type: "text",
      props: {
        html: "<p>Hi</p>",
      },
    },
  ],
} as unknown as PublicPageView;

describe("PublicPagesResolver", () => {
  let app: INestApplication;
  const query = vi.fn();
  const command = vi.fn();

  beforeEach(async () => {
    query.mockReset();
    command.mockReset();
    const moduleRef = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>(graphqlConfig),
      ],
      providers: [
        PublicPagesResolver,
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
          useValue: {},
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

  const gql = (q: string, variables?: object) =>
    request(app.getHttpServer())
      .post("/graphql")
      .set("User-Agent", "test-agent")
      .send({
        query: q,
        variables,
      });

  it("reads a live page without signing in", async () => {
    query.mockResolvedValue(page);
    const res = await gql(
      '{ publicPage(path: "about") { title blocks { id type props } } }',
    );
    expect(res.body).toEqual({
      data: {
        publicPage: {
          title: "About",
          blocks: [
            {
              id: "b1",
              type: "text",
              props: {
                html: "<p>Hi</p>",
              },
            },
          ],
        },
      },
    });
    expect(query).toHaveBeenCalledWith(new GetPublicPageQuery("about"));
  });

  it("reports a missing page as not found", async () => {
    query.mockResolvedValue(null);
    const res = await gql('{ publicPage(path: "nope") { title } }');
    expect(res.body.errors[0].extensions.status).toBe(404);
  });

  it("sends a contact message with the visitor's user agent", async () => {
    const res = await gql(
      "mutation ($i: ContactFormInput!) { sendContactMessage(input: $i) }",
      {
        i: {
          pageId: "7",
          blockId: "b2",
          fields: {
            email: "a@b.c",
          },
        },
      },
    );
    expect(res.body).toEqual({
      data: {
        sendContactMessage: true,
      },
    });
    expect(command).toHaveBeenCalledWith(
      new SendContactMessageCommand(
        7n,
        "b2",
        {
          email: "a@b.c",
        },
        expect.any(String),
        "test-agent",
      ),
    );
  });

  it("drops honeypot messages silently", async () => {
    const res = await gql(
      'mutation { sendContactMessage(input: { pageId: "7", blockId: "b", fields: {}, website: "spam" }) }',
    );
    expect(res.body.data.sendContactMessage).toBe(true);
    expect(command).not.toHaveBeenCalled();
  });

  it("validates input with the REST schema", async () => {
    const res = await gql(
      'mutation { sendContactMessage(input: { pageId: "0", blockId: "b", fields: {} }) }',
    );
    expect(res.body.errors[0].extensions).toMatchObject({
      code: "validation_failed",
      status: 400,
    });
  });
});
