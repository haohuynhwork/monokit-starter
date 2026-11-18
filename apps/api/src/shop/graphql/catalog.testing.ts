import { type ApolloDriverConfig } from "@nestjs/apollo";
import type { INestApplication, Type } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { GraphQLModule } from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { type Mock, vi } from "vitest";
import { TOKEN_SERVICE } from "../../auth/domain/tokens.js";
import { AuthGuard } from "../../auth/http/auth.guard.js";
import { PermissionResolver } from "../../auth/http/permission-resolver.js";
import { testPermissionResolver } from "../../auth/http/permission-resolver.testing.js";
import { graphqlConfig } from "../../common/graphql/graphql.config.js";
import { ApiExceptionFilter } from "../../common/http/responses/api-exception.filter.js";
import { ResponseInterceptor } from "../../common/http/responses/response.interceptor.js";
import {
  type BuiltInRoleKey,
  builtInPermissions,
} from "../../users/domain/permissions.js";
import type { ProductView } from "../application/queries/shop.view.js";

// Test app for the catalog resolver specs: mocked buses, the app's real
// globals. The bearer token is the role ("admin", "editor", "author").
// A resolver with only mutations needs another for the Query root.
export async function catalogApp(...resolvers: Type[]) {
  const commands: Mock = vi.fn();
  const queries: Mock = vi.fn();
  const moduleRef = await Test.createTestingModule({
    imports: [
      GraphQLModule.forRoot<ApolloDriverConfig>(graphqlConfig),
    ],
    providers: [
      ...resolvers,
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
          verifyAccess: (role: string) =>
            Promise.resolve({
              userId: 7n,
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
  const app: INestApplication = moduleRef.createNestApplication();
  await app.init();
  const gql = (query: string, variables?: object, role?: string) => {
    const req = request(app.getHttpServer()).post("/graphql");
    if (role) {
      req.set("Authorization", `Bearer ${role}`);
    }
    return req.send({
      query,
      variables,
    });
  };
  return {
    app,
    commands,
    queries,
    gql,
  };
}

export const user = {
  id: 7n,
  sessionId: 1n,
};

export const product: ProductView = {
  id: "1",
  categoryId: null,
  name: "Tee",
  slug: "tee",
  description: "",
  priceMin: "1000",
  priceMax: "1000",
  sale: {
    startsAt: "2030-01-01T00:00:00Z",
    endsAt: null,
  },
  inStock: true,
  options: [],
  variants: [
    {
      id: "2",
      sku: null,
      values: {},
      name: "",
      listPrice: "1000",
      salePrice: null,
      price: "1000",
      sale: "500",
      trackStock: false,
      stock: 3,
      inStock: true,
      image: null,
      imageUrl: null,
    },
  ],
  status: "active",
  rating: {
    count: 0,
    average: null,
  },
  cover: null,
  gallery: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

// What the guard puts on the request for a built-in role (the signed-in user
// the specs act as): the actor a command gets
export const actorFor = (role: BuiltInRoleKey) => ({
  ...user,
  role,
  permissions: builtInPermissions(role),
});
