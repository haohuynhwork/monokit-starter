import type { AddressInfo } from "node:net";
import type { ApolloDriverConfig } from "@nestjs/apollo";
import type { INestApplication } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { GraphQLModule } from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import { type Client, createClient } from "graphql-ws";
import WebSocket from "ws";
import { TOKEN_SERVICE } from "../../auth/domain/tokens.js";
import { AuthGuard } from "../../auth/http/auth.guard.js";
import { PermissionResolver } from "../../auth/http/permission-resolver.js";
import { testPermissionResolver } from "../../auth/http/permission-resolver.testing.js";
import { graphqlWsConfig } from "../../common/graphql/graphql-ws.js";
import { ApiExceptionFilter } from "../../common/http/responses/api-exception.filter.js";
import { ResponseInterceptor } from "../../common/http/responses/response.interceptor.js";
import { REALTIME_STREAM } from "../domain/notification.repository.js";
import { PubSubRealtime } from "../infrastructure/pubsub-realtime.js";
import { NotificationsResolver } from "./notifications.resolver.js";

// GraphQL over a real WebSocket: sign-in at connect, then the subscription
// and a plain query on the same socket
describe("notificationEvents over WebSocket", () => {
  let app: INestApplication;
  let url: string;
  const clients: Client[] = [];
  const pubsub = new PubSubRealtime();
  const queries = vi.fn();

  beforeEach(async () => {
    queries.mockReset();
    const moduleRef = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>(
          graphqlWsConfig(async (params) => {
            if (params?.ticket === "good") {
              return {
                id: 7n,
                role: "editor",
                permissions: new Set<string>(),
                sessionId: 1n,
              };
            }
            return params?.ticket ? null : undefined;
          }),
        ),
      ],
      providers: [
        NotificationsResolver,
        {
          provide: REALTIME_STREAM,
          useValue: pubsub,
        },
        {
          provide: CommandBus,
          useValue: {},
        },
        {
          provide: QueryBus,
          useValue: {
            execute: queries,
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
    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;
    url = `ws://127.0.0.1:${port}/graphql`;
  });

  afterEach(async () => {
    await Promise.all(clients.splice(0).map(async (c) => c.dispose()));
    await app.close();
  });

  const connect = (connectionParams?: Record<string, unknown>) => {
    const client = createClient({
      url,
      webSocketImpl: WebSocket,
      connectionParams,
      retryAttempts: 0,
      lazy: false,
      onNonLazyError: () => undefined,
    });
    clients.push(client);
    return client;
  };

  it("pushes my notification events", async () => {
    const client = connect({
      ticket: "good",
    });
    const events = client.iterate({
      query:
        "subscription { notificationEvents { type id wasUnread notification { id type } } }",
    });
    const first = events.next();
    // Let the subscription register before publishing
    await vi.waitFor(() => {
      pubsub.toUser(8n, "notification:read", {
        id: "1",
      });
      pubsub.toUser(7n, "notification:read", {
        id: "5",
      });
      return Promise.race([
        first,
        new Promise((_, reject) => setTimeout(reject, 20)),
      ]);
    });
    expect((await first).value).toEqual({
      data: {
        notificationEvents: {
          type: "notification:read",
          id: "5",
          wasUnread: null,
          notification: null,
        },
      },
    });
    await events.return?.();
  });

  it("runs queries on the same socket", async () => {
    queries.mockResolvedValue({
      items: [],
      unread: 3,
      nextCursor: null,
    });
    const client = connect({
      ticket: "good",
    });
    const result = await client
      .iterate({
        query: "{ notifications { unread } }",
      })
      .next();
    expect(result.value).toEqual({
      data: {
        notifications: {
          unread: 3,
        },
      },
    });
  });

  it("needs a sign-in to subscribe", async () => {
    const client = connect();
    const result = await client
      .iterate({
        query: "subscription { notificationEvents { type } }",
      })
      .next()
      .catch((e: unknown) => e);
    expect(JSON.stringify(result)).toContain("invalid_token");
  });

  it("refuses a bad ticket", async () => {
    const client = connect({
      ticket: "bad",
    });
    const error = await client
      .iterate({
        query: "{ notifications { unread } }",
      })
      .next()
      .catch((e: { code?: number }) => e);
    expect(error).toMatchObject({
      code: 4403,
    });
  });
});
