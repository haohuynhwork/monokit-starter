import type { CommandBus, QueryBus } from "@nestjs/cqrs";
import type { MailQueue } from "../../domain/mailer.js";
import type { EmailDelivery } from "../email-delivery.js";
import { SendEmailCommand } from "./send-email.command.js";
import { SendTestEmailCommand } from "./send-test-email.command.js";
import { SendTestEmailHandler } from "./send-test-email.handler.js";

function setup(queues: boolean) {
  const deliver = vi.fn().mockResolvedValue(undefined);
  const execute = vi.fn().mockResolvedValue(undefined);
  const handler = new SendTestEmailHandler(
    {
      deliver,
    } as unknown as EmailDelivery,
    {
      execute,
    } as unknown as CommandBus,
    {
      execute: vi.fn().mockResolvedValue({
        email: "admin@x.com",
      }),
    } as unknown as QueryBus,
    {
      queues,
      enqueue: vi.fn(),
    } as MailQueue,
  );
  return {
    deliver,
    execute,
    handler,
  };
}

describe("SendTestEmailHandler", () => {
  it("sync: delivers in the request, never queued", async () => {
    const { deliver, execute, handler } = setup(true);
    await expect(
      handler.execute(new SendTestEmailCommand(1n, true)),
    ).resolves.toEqual({
      to: "admin@x.com",
      queued: false,
    });
    expect(deliver).toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("not sync: goes the way real mail does", async () => {
    const { deliver, execute, handler } = setup(true);
    await expect(
      handler.execute(new SendTestEmailCommand(1n, false, " a@b.c ")),
    ).resolves.toEqual({
      to: "a@b.c",
      queued: true,
    });
    expect(execute.mock.calls[0]![0]).toBeInstanceOf(SendEmailCommand);
    expect(deliver).not.toHaveBeenCalled();
  });

  it("doesn't claim queued without a queue (no Valkey)", async () => {
    const { handler } = setup(false);
    await expect(
      handler.execute(new SendTestEmailCommand(1n, false)),
    ).resolves.toMatchObject({
      queued: false,
    });
  });
});
