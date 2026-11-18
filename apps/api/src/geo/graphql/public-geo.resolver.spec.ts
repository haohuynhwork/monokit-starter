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
import { ListLocalesQuery } from "../application/queries/list-locales.query.js";
import { ListRegionsQuery } from "../application/queries/list-regions.query.js";
import { PublicGeoResolver } from "./public-geo.resolver.js";

describe("PublicGeoResolver", () => {
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
        PublicGeoResolver,
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

  it("lists active regions without sign-in", async () => {
    queries.mockResolvedValue([
      {
        id: "1",
        countryCode: "VN",
        parentId: null,
        code: "HN",
        name: "Ha Noi",
        position: 0,
        active: true,
      },
    ]);
    const res = await gql(
      '{ regions(country: "VN") { id parentId name } }',
      undefined,
      "",
    );
    expect(res.body).toEqual({
      data: {
        regions: [
          {
            id: "1",
            parentId: null,
            name: "Ha Noi",
          },
        ],
      },
    });
    expect(queries).toHaveBeenCalledWith(
      new ListRegionsQuery({
        countryCode: "VN",
        parentId: undefined,
        activeOnly: true,
      }),
    );
  });

  it("lists active locales", async () => {
    queries.mockResolvedValue([]);
    const res = await gql("{ locales { code } }", undefined, "");
    expect(res.body).toEqual({
      data: {
        locales: [],
      },
    });
    expect(queries).toHaveBeenCalledWith(new ListLocalesQuery(true));
  });

  it("rejects a bad country code", async () => {
    const res = await gql('{ regions(country: "Viet") { id } }', undefined, "");
    expect(res.body.errors[0].extensions).toMatchObject({
      code: "validation_failed",
      status: 400,
    });
    expect(queries).not.toHaveBeenCalled();
  });
});
