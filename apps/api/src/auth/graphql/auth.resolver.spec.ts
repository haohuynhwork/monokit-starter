import { type ApolloDriverConfig } from "@nestjs/apollo";
import type { INestApplication } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { GraphQLModule } from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { graphqlConfig } from "../../common/graphql/graphql.config.js";
import { ApiExceptionFilter } from "../../common/http/responses/api-exception.filter.js";
import { ResponseInterceptor } from "../../common/http/responses/response.interceptor.js";
import { LoginCommand } from "../application/commands/login.command.js";
import { RevokeSessionCommand } from "../application/commands/revoke-session.command.js";
import { ListSessionsQuery } from "../application/queries/list-sessions.query.js";
import { InvalidTokenError } from "../domain/auth.errors.js";
import { TOKEN_SERVICE } from "../domain/tokens.js";
import { AuthGuard } from "../http/auth.guard.js";
import { PermissionResolver } from "../http/permission-resolver.js";
import { testPermissionResolver } from "../http/permission-resolver.testing.js";
import { AuthResolver } from "./auth.resolver.js";

const tokens = {
  accessToken: "access",
  refreshToken: "refresh",
  expiresIn: 900,
  refreshExpiresIn: 86_400,
};

describe("AuthResolver", () => {
  let app: INestApplication;
  const command = vi.fn();
  const query = vi.fn();
  const verifyAccess = vi.fn();

  beforeEach(async () => {
    command.mockReset();
    query.mockReset();
    verifyAccess.mockReset();
    const moduleRef = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>(graphqlConfig),
      ],
      providers: [
        AuthResolver,
        {
          provide: CommandBus,
          useValue: {
            execute: command,
          },
        },
        {
          provide: QueryBus,
          useValue: {
            execute: query,
          },
        },
        {
          provide: TOKEN_SERVICE,
          useValue: {
            verifyAccess,
            issueWsTicket: vi.fn().mockResolvedValue("ticket"),
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

  const gql = (q: string, variables?: object, token?: string) => {
    const req = request(app.getHttpServer())
      .post("/graphql")
      .set("User-Agent", "test-agent");
    if (token) {
      req.set("Authorization", `Bearer ${token}`);
    }
    return req.send({
      query: q,
      variables,
    });
  };

  it("logs in and sets the auth cookies", async () => {
    command.mockResolvedValue(tokens);
    const res = await gql(
      "mutation ($i: LoginInput!) { login(input: $i) { accessToken expiresIn } }",
      {
        i: {
          email: "a@b.c",
          password: "secret",
        },
      },
    );
    expect(res.body).toEqual({
      data: {
        login: {
          accessToken: "access",
          expiresIn: 900,
        },
      },
    });
    expect(command).toHaveBeenCalledWith(
      new LoginCommand("a@b.c", "secret", {
        userAgent: "test-agent",
        ip: expect.any(String),
      }),
    );
    expect(String(res.headers["set-cookie"])).toContain("access_token=access");
  });

  it("reports invalid input with the REST error code", async () => {
    const res = await gql(
      "mutation ($i: LoginInput!) { login(input: $i) { accessToken } }",
      {
        i: {
          email: "a@b.c",
          password: "x".repeat(300),
        },
      },
    );
    expect(res.body.errors[0]).toMatchObject({
      extensions: {
        code: "validation_failed",
      },
    });
    expect(command).not.toHaveBeenCalled();
  });

  it("refresh without a token or cookie fails", async () => {
    const res = await gql("mutation { refresh { accessToken } }");
    expect(res.body.errors[0].extensions.status).toBe(401);
    expect(command).not.toHaveBeenCalled();
  });

  it("needs a signed-in user for sessions", async () => {
    verifyAccess.mockRejectedValue(new InvalidTokenError());
    const res = await gql("{ sessions { id } }", undefined, "bad");
    expect(res.body.errors[0].extensions.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it("lists sessions and revokes one", async () => {
    verifyAccess.mockResolvedValue({
      userId: 1n,
      role: "author",
      sessionId: 7n,
    });
    query.mockResolvedValue([
      {
        id: "7",
        userAgent: null,
        ip: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        lastUsedAt: "2026-01-01T00:00:00.000Z",
        current: true,
      },
    ]);
    const list = await gql("{ sessions { id current } }", undefined, "ok");
    expect(list.body.data.sessions).toEqual([
      {
        id: "7",
        current: true,
      },
    ]);
    expect(query).toHaveBeenCalledWith(new ListSessionsQuery(1n, 7n));

    const res = await gql(
      'mutation { revokeSession(id: "9") }',
      undefined,
      "ok",
    );
    expect(res.body).toEqual({
      data: {
        revokeSession: true,
      },
    });
    expect(command).toHaveBeenCalledWith(new RevokeSessionCommand(1n, 9n));
  });
});
