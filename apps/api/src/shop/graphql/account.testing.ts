import type { ApolloDriverConfig } from "@nestjs/apollo";
import type { INestApplication, Type } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { GraphQLModule } from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { Mock } from "vitest";
import { TOKEN_SERVICE } from "../../auth/domain/tokens.js";
import { AuthGuard } from "../../auth/http/auth.guard.js";
import { PermissionResolver } from "../../auth/http/permission-resolver.js";
import { testPermissionResolver } from "../../auth/http/permission-resolver.testing.js";
import { graphqlConfig } from "../../common/graphql/graphql.config.js";
import { ApiExceptionFilter } from "../../common/http/responses/api-exception.filter.js";
import { ResponseInterceptor } from "../../common/http/responses/response.interceptor.js";

// Test app for the account resolvers: mocked buses, the app's real globals.
// Token "good" signs in as user 7.
export async function accountApp(
  resolver: Type,
  commands: Mock,
  queries: Mock,
): Promise<{
  app: INestApplication;
  gql: (query: string, variables?: object, signedIn?: boolean) => request.Test;
}> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      GraphQLModule.forRoot<ApolloDriverConfig>(graphqlConfig),
    ],
    providers: [
      resolver,
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
          verifyAccess: (token: string) =>
            token === "good"
              ? Promise.resolve({
                  userId: 7n,
                  role: "user",
                  sessionId: 1n,
                })
              : Promise.reject(new Error("bad token")),
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
  const app = moduleRef.createNestApplication();
  await app.init();
  const gql = (query: string, variables?: object, signedIn = true) => {
    const req = request(app.getHttpServer()).post("/graphql");
    if (signedIn) {
      void req.set("Authorization", "Bearer good");
    }
    return req.send({
      query,
      variables,
    });
  };
  return {
    app,
    gql,
  };
}
