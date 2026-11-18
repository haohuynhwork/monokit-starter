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
import { MarkNotificationReadCommand } from "../application/commands/mark-notification-read.command.js";
import { SendTestNotificationCommand } from "../application/commands/send-test-notification.command.js";
import { ListNotificationsQuery } from "../application/queries/list-notifications.query.js";
import { REALTIME_STREAM } from "../domain/notification.repository.js";
import { NotificationsResolver } from "./notifications.resolver.js";

describe("NotificationsResolver", () => {
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
        NotificationsResolver,
        {
          provide: REALTIME_STREAM,
          useValue: {},
        },
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

  it("lists my notifications", async () => {
    queries.mockResolvedValue({
      items: [
        {
          id: "9",
          type: "test",
          data: {},
          actor: null,
          createdAt: "2026-10-01T00:00:00.000Z",
          read: false,
        },
      ],
      unread: 1,
      nextCursor: null,
    });
    const res = await gql(
      '{ notifications(limit: 5, before: "10") { items { id type data actor { name } } unread nextCursor } }',
    );
    expect(res.body).toEqual({
      data: {
        notifications: {
          items: [
            {
              id: "9",
              type: "test",
              data: {},
              actor: null,
            },
          ],
          unread: 1,
          nextCursor: null,
        },
      },
    });
    expect(queries).toHaveBeenCalledWith(
      new ListNotificationsQuery(1n, 5, 10n),
    );
  });

  it("marks one as read", async () => {
    const res = await gql('mutation { markNotificationRead(id: "9") }');
    expect(res.body.data.markNotificationRead).toBe(true);
    expect(commands).toHaveBeenCalledWith(
      new MarkNotificationReadCommand(9n, 1n),
    );
  });

  it("sends a test notification as admin only", async () => {
    let res = await gql("mutation { sendTestNotification { id } }");
    expect(res.body.errors[0].extensions.status).toBe(403);
    role = "admin";
    commands.mockResolvedValue(42n);
    res = await gql("mutation { sendTestNotification { id } }");
    expect(res.body.data.sendTestNotification).toEqual({
      id: "42",
    });
    expect(commands).toHaveBeenCalledWith(new SendTestNotificationCommand(1n));
  });

  it("rejects a bad limit", async () => {
    const res = await gql("{ notifications(limit: 500) { unread } }");
    expect(res.body.errors[0].extensions).toMatchObject({
      code: "validation_failed",
      status: 400,
    });
    expect(queries).not.toHaveBeenCalled();
  });

  it("requires a sign-in", async () => {
    const res = await gql("{ notifications { unread } }", undefined, "");
    expect(res.body.errors[0].extensions.status).toBe(401);
  });
});
