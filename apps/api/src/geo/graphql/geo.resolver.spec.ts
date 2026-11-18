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
import { CreateCurrencyCommand } from "../application/commands/create-currency.command.js";
import { DeleteRegionCommand } from "../application/commands/delete-region.command.js";
import { ListRegionsQuery } from "../application/queries/list-regions.query.js";
import type { CurrencyView } from "../application/queries/locale.view.js";
import { GeoResolver } from "./geo.resolver.js";

const usd: CurrencyView = {
  id: "7",
  code: "USD",
  name: "US dollar",
  symbol: "$",
  decimals: 2,
  rate: "0.00004",
  rateAt: "2026-10-01T00:00:00.000Z",
  active: true,
  position: 0,
  isBase: false,
};

describe("GeoResolver", () => {
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
        GeoResolver,
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

  it("lists a country's regions, 'root' for the top level", async () => {
    queries.mockResolvedValue([]);
    const res = await gql(
      '{ allRegions(country: "vn", parentId: "root") { id } }',
    );
    expect(res.body).toEqual({
      data: {
        allRegions: [],
      },
    });
    expect(queries).toHaveBeenCalledWith(
      new ListRegionsQuery({
        countryCode: "VN",
        parentId: null,
        activeOnly: false,
      }),
    );
  });

  it("creates a currency and returns it", async () => {
    commands.mockResolvedValue(7n);
    queries.mockResolvedValue({
      base: "VND",
      items: [
        usd,
      ],
    });
    const res = await gql(
      'mutation { createCurrency(input: { code: "USD", name: "US dollar", rate: "0.00004" }) { id code isBase } }',
    );
    expect(res.body).toEqual({
      data: {
        createCurrency: {
          id: "7",
          code: "USD",
          isBase: false,
        },
      },
    });
    expect(commands.mock.calls[0][0]).toBeInstanceOf(CreateCurrencyCommand);
    expect(commands.mock.calls[0][0]).toMatchObject({
      input: {
        code: "USD",
        rate: "0.00004",
      },
    });
  });

  it("deletes a region and returns true", async () => {
    const res = await gql('mutation { deleteRegion(id: "3") }');
    expect(res.body).toEqual({
      data: {
        deleteRegion: true,
      },
    });
    expect(commands.mock.calls[0][0]).toEqual(
      new DeleteRegionCommand(3n, expect.anything()),
    );
  });

  it("rejects invalid input with the REST error code", async () => {
    const res = await gql(
      'mutation { createRegion(input: { countryCode: "VNM", code: "x", name: "X" }) { id } }',
    );
    expect(res.body.errors[0].extensions).toMatchObject({
      code: "validation_failed",
      status: 400,
    });
    expect(commands).not.toHaveBeenCalled();
  });

  it("refuses customers", async () => {
    role = "customer";
    const res = await gql("{ allLocales { id } }");
    expect(res.body.errors[0].extensions.status).toBe(403);
    expect(queries).not.toHaveBeenCalled();
  });
});
