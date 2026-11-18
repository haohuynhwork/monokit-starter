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
import { ResetConfigCommand } from "../application/commands/reset-config.command.js";
import { SetConfigCommand } from "../application/commands/set-config.command.js";
import { ConfigsResolver } from "./configs.resolver.js";

describe("ConfigsResolver", () => {
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
        ConfigsResolver,
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

  it("reads public settings without sign-in", async () => {
    queries.mockResolvedValue({
      "site.name": "My CMS",
    });
    const res = await gql("{ publicConfigs }", undefined, "");
    expect(res.body).toEqual({
      data: {
        publicConfigs: {
          "site.name": "My CMS",
        },
      },
    });
  });

  it("sets a setting with a JSON value", async () => {
    role = "admin";
    const res = await gql(
      'mutation ($v: JSON) { setConfig(key: "site.name", value: $v) }',
      {
        v: {
          a: 1,
        },
      },
    );
    expect(res.body).toEqual({
      data: {
        setConfig: true,
      },
    });
    expect(commands).toHaveBeenCalledWith(
      new SetConfigCommand(
        "site.name",
        {
          a: 1,
        },
        1n,
      ),
    );
  });

  it("resets a setting", async () => {
    role = "admin";
    const res = await gql('mutation { resetConfig(key: "site.name") }');
    expect(res.body.data.resetConfig).toBe(true);
    expect(commands).toHaveBeenCalledWith(new ResetConfigCommand("site.name"));
  });

  it("refuses non-admins", async () => {
    const res = await gql("{ configs { key } }");
    expect(res.body.errors[0].extensions.status).toBe(403);
    expect(queries).not.toHaveBeenCalled();
  });

  it("requires a sign-in", async () => {
    const res = await gql('mutation { resetConfig(key: "x") }', undefined, "");
    expect(res.body.errors[0].extensions.status).toBe(401);
    expect(commands).not.toHaveBeenCalled();
  });
});
