import { type ApolloDriverConfig } from "@nestjs/apollo";
import type { INestApplication } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { GraphQLModule, Query, Resolver } from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { TOKEN_SERVICE } from "../../auth/domain/tokens.js";
import { AuthGuard } from "../../auth/http/auth.guard.js";
import { PermissionResolver } from "../../auth/http/permission-resolver.js";
import { testPermissionResolver } from "../../auth/http/permission-resolver.testing.js";
import { graphqlConfig } from "../../common/graphql/graphql.config.js";
import { ApiExceptionFilter } from "../../common/http/responses/api-exception.filter.js";
import { ResponseInterceptor } from "../../common/http/responses/response.interceptor.js";
import { SendTestEmailCommand } from "../application/commands/send-test-email.command.js";
import { MailResolver } from "./mail.resolver.js";

// A schema needs a Query; mail only has a mutation
@Resolver()
class StubResolver {
  @Query(() => Boolean)
  ok(): boolean {
    return true;
  }
}

describe("MailResolver", () => {
  let app: INestApplication;
  const commands = vi.fn();
  const queries = vi.fn();
  let role = "editor";

  beforeEach(async () => {
    commands.mockReset();
    queries.mockReset();
    role = "editor";
    const moduleRef = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>(graphqlConfig),
      ],
      providers: [
        MailResolver,
        StubResolver,
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
              role,
              sessionId: 1n,
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

  it("sends a test email, sync by default", async () => {
    role = "admin";
    commands.mockResolvedValue({
      to: "a@b.c",
      queued: false,
    });
    const res = await gql(
      'mutation { sendTestEmail(input: { to: "a@b.c" }) { to queued } }',
    );
    expect(res.body).toEqual({
      data: {
        sendTestEmail: {
          to: "a@b.c",
          queued: false,
        },
      },
    });
    expect(commands).toHaveBeenCalledWith(
      new SendTestEmailCommand(1n, true, "a@b.c"),
    );
  });

  it("works without input", async () => {
    role = "admin";
    commands.mockResolvedValue({
      to: "me@b.c",
      queued: true,
    });
    const res = await gql("mutation { sendTestEmail { queued } }");
    expect(res.body.data.sendTestEmail.queued).toBe(true);
    expect(commands).toHaveBeenCalledWith(
      new SendTestEmailCommand(1n, true, undefined),
    );
  });

  it("refuses non-admins", async () => {
    const res = await gql("mutation { sendTestEmail { queued } }");
    expect(res.body.errors[0].extensions.status).toBe(403);
    expect(commands).not.toHaveBeenCalled();
  });
});
