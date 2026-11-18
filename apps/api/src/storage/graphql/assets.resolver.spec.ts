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
import { CreateFolderCommand } from "../application/commands/create-folder.command.js";
import type { AssetView } from "../application/queries/asset.view.js";
import { GetAssetQuery } from "../application/queries/get-asset.query.js";
import { AssetsResolver } from "./assets.resolver.js";

const asset: AssetView = {
  id: "7",
  parentId: null,
  kind: "directory",
  visibility: "private",
  name: "Docs",
  slug: "docs",
  path: "docs",
  mimeType: null,
  sizeBytes: null,
  url: null,
  key: "abc",
  createdById: "1",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

describe("AssetsResolver", () => {
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
        AssetsResolver,
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

  const gql = (q: string, variables?: object, token = "t") => {
    const req = request(app.getHttpServer()).post("/graphql");
    if (token) {
      req.set("Authorization", `Bearer ${token}`);
    }
    return req.send({
      query: q,
      variables,
    });
  };

  it("gets an asset by id", async () => {
    query.mockResolvedValue(asset);
    const res = await gql('{ asset(id: "7") { id name kind url } }');
    expect(res.body).toEqual({
      data: {
        asset: {
          id: "7",
          name: "Docs",
          kind: "directory",
          url: null,
        },
      },
    });
    expect(query).toHaveBeenCalledWith(
      new GetAssetQuery(
        {
          id: 7n,
        },
        1n,
        expect.anything(),
      ),
    );
  });

  it("creates a folder", async () => {
    command.mockResolvedValue(7n);
    query.mockResolvedValue(asset);
    const res = await gql(
      'mutation { createAssetFolder(input: { name: "Docs" }) { id } }',
    );
    expect(res.body).toEqual({
      data: {
        createAssetFolder: {
          id: "7",
        },
      },
    });
    expect(command).toHaveBeenCalledWith(
      new CreateFolderCommand(
        null,
        "Docs",
        {
          id: 1n,
          permissions: builtInPermissions("editor"),
        },
        "private",
      ),
    );
  });

  it("requires sign-in", async () => {
    const res = await gql("{ assetFolders { id } }", undefined, "");
    expect(res.body.errors[0].extensions).toMatchObject({
      status: 401,
    });
    expect(query).not.toHaveBeenCalled();
  });

  it("validates arguments", async () => {
    const res = await gql("{ assets(limit: 500) { total } }");
    expect(res.body.errors[0].extensions).toMatchObject({
      code: "validation_failed",
      issues: [
        {
          path: "limit",
        },
      ],
    });
    expect(query).not.toHaveBeenCalled();
  });
});
