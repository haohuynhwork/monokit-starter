import type { CommandBus } from "@nestjs/cqrs";
import { LoginFailedEvent } from "../../../auth/domain/events/login-failed.event.js";
import { LoginSucceededEvent } from "../../../auth/domain/events/login-succeeded.event.js";
import { ConfigUpdatedEvent } from "../../../configs/domain/events/config-updated.event.js";
import { PostPublishedEvent } from "../../../posts/domain/events/post-published.event.js";
import { OrderPlacedEvent } from "../../../shop/domain/events/order-placed.event.js";
import { RecordAuditEventCommand } from "../commands/record-audit-event.command.js";
import { configUpdatedEntry } from "./config-updated.handler.js";
import { loginFailedEntry } from "./login-failed.handler.js";
import {
  LoginSucceededAuditor,
  loginSucceededEntry,
} from "./login-succeeded.handler.js";
import { orderPlacedEntry } from "./order-placed.handler.js";
import { postPublishedEntry } from "./post-published.handler.js";

const meta = {
  ip: "10.0.0.1",
  userAgent: "ua",
};

describe("audit event mapping", () => {
  it("posts.published", () => {
    expect(
      postPublishedEntry(
        new PostPublishedEvent(7n, "Paris", "travel/paris", 1n, meta),
      ),
    ).toEqual({
      actor: {
        userId: 1n,
        ...meta,
      },
      action: "posts.published",
      entity: {
        type: "post",
        id: "7",
      },
      data: {
        title: "Paris",
        path: "travel/paris",
      },
    });
  });

  it("orders.placed, with the total as text", () => {
    expect(
      orderPlacedEntry(
        new OrderPlacedEvent(3n, 2n, 1500n, "EUR", [
          9n,
        ]),
      ),
    ).toEqual({
      actor: {
        userId: 2n,
      },
      action: "orders.placed",
      entity: {
        type: "order",
        id: "3",
      },
      data: {
        total: "1500",
        currency: "EUR",
      },
    });
  });

  it("configs.updated stores the key, not the value", () => {
    const entry = configUpdatedEntry(
      new ConfigUpdatedEvent("mail.smtp", 1n, meta),
    );
    expect(entry).toMatchObject({
      action: "configs.updated",
      entity: {
        type: "config",
        id: "mail.smtp",
      },
      data: {
        key: "mail.smtp",
      },
    });
  });

  it("auth.login", () => {
    expect(
      loginSucceededEntry(new LoginSucceededEvent(4n, "password", meta)),
    ).toMatchObject({
      actor: {
        userId: 4n,
        ip: "10.0.0.1",
      },
      action: "auth.login",
      entity: {
        type: "user",
        id: "4",
      },
      data: {
        provider: "password",
      },
    });
  });

  it("auth.login_failed is anonymous, with no target", () => {
    expect(
      loginFailedEntry(new LoginFailedEvent("invalid_credentials", meta)),
    ).toEqual({
      actor: {
        userId: null,
        ...meta,
      },
      action: "auth.login_failed",
      entity: null,
      data: {
        reason: "invalid_credentials",
      },
    });
  });

  it("an auditor sends the entry as a RecordAuditEventCommand", async () => {
    const commands = {
      execute: vi.fn().mockResolvedValue(undefined),
    };
    const event = new LoginSucceededEvent(4n, "password");
    await new LoginSucceededAuditor(commands as unknown as CommandBus).handle(
      event,
    );
    expect(commands.execute).toHaveBeenCalledWith(
      new RecordAuditEventCommand(loginSucceededEntry(event)),
    );
  });
});
