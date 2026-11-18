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
import { ChangeContactMessageStatusCommand } from "../application/commands/change-contact-message-status.command.js";
import { CreateContactMessageCommand } from "../application/commands/create-contact-message.command.js";
import type { ContactMessageDetail } from "../application/queries/contact-message.view.js";
import { ListContactMessagesQuery } from "../application/queries/list-contact-messages.query.js";
import { ContactMessagesResolver } from "./contact-messages.resolver.js";

const message: ContactMessageDetail = {
  id: "3",
  name: "Ann",
  email: "ann@example.com",
  phone: null,
  subject: null,
  message: "Hi",
  messageFormat: "text",
  status: "new",
  mailedAt: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  ip: null,
  userAgent: null,
};

describe("ContactMessagesResolver", () => {
  let app: INestApplication;
  const query = vi.fn();
  const command = vi.fn();
  const verifyAccess = vi.fn();

  beforeEach(async () => {
    query.mockReset();
    command.mockReset();
    verifyAccess.mockReset().mockResolvedValue({
      userId: 1n,
      role: "admin",
      sessionId: 1n,
    });
    const moduleRef = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>(graphqlConfig),
      ],
      providers: [
        ContactMessagesResolver,
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

  const gql = (q: string, variables?: object) =>
    request(app.getHttpServer())
      .post("/graphql")
      .set("Authorization", "Bearer t")
      .send({
        query: q,
        variables,
      });

  it("lists messages a page at a time", async () => {
    query.mockResolvedValue({
      items: [
        message,
      ],
      total: 1,
    });
    const res = await gql(
      '{ contactMessages(status: "new", limit: 5) { items { id email } meta { total limit offset } } }',
    );
    expect(res.body).toEqual({
      data: {
        contactMessages: {
          items: [
            {
              id: "3",
              email: "ann@example.com",
            },
          ],
          meta: {
            total: 1,
            limit: 5,
            offset: 0,
          },
        },
      },
    });
    expect(query).toHaveBeenCalledWith(
      new ListContactMessagesQuery("new", 5, 0),
    );
  });

  it("counts messages per status", async () => {
    query.mockResolvedValue({
      new: 2,
      read: 1,
      replied: 0,
      spam: 0,
      archived: 0,
    });
    const res = await gql("{ contactMessageCounts { new read } }");
    expect(res.body.data.contactMessageCounts).toEqual({
      new: 2,
      read: 1,
    });
  });

  it("creates a message and reads it back", async () => {
    command.mockResolvedValue(3n);
    query.mockResolvedValue(message);
    const res = await gql(
      'mutation { createContactMessage(input: { email: "ann@example.com" }) { id ip } }',
    );
    expect(res.body.data.createContactMessage).toEqual({
      id: "3",
      ip: null,
    });
    expect(command).toHaveBeenCalledWith(
      new CreateContactMessageCommand(
        {
          email: "ann@example.com",
        },
        "read",
      ),
    );
  });

  it("changes the status", async () => {
    const res = await gql(
      'mutation { changeContactMessageStatus(id: "3", status: "spam") }',
    );
    expect(res.body.data.changeContactMessageStatus).toBe(true);
    expect(command).toHaveBeenCalledWith(
      new ChangeContactMessageStatusCommand(3n, "spam"),
    );
  });

  it("rejects an unknown status", async () => {
    const res = await gql(
      'mutation { changeContactMessageStatus(id: "3", status: "lost") }',
    );
    expect(res.body.errors[0].extensions).toMatchObject({
      code: "validation_failed",
      status: 400,
    });
    expect(command).not.toHaveBeenCalled();
  });

  it("refuses users who are not staff", async () => {
    verifyAccess.mockResolvedValue({
      userId: 1n,
      role: "user",
      sessionId: 1n,
    });
    const res = await gql('{ contactMessage(id: "3") { id } }');
    expect(res.body.errors[0].extensions.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });
});
