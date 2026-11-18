import { InvalidRecipientError } from "../../domain/mail.errors.js";
import type { MailQueue } from "../../domain/mailer.js";
import type { EmailDelivery } from "../email-delivery.js";
import { SendEmailCommand } from "./send-email.command.js";
import { SendEmailHandler } from "./send-email.handler.js";

const message = {
  to: "a@b.c",
  subject: "s",
  text: "t",
};

describe("SendEmailHandler", () => {
  it("checks, then queues", async () => {
    const queue = {
      queues: true,
      enqueue: vi.fn().mockResolvedValue(undefined),
    };
    const delivery = {
      check: vi.fn().mockResolvedValue({}),
    };
    await new SendEmailHandler(
      delivery as unknown as EmailDelivery,
      queue as MailQueue,
    ).execute(new SendEmailCommand(message));
    expect(delivery.check).toHaveBeenCalledWith(message);
    expect(queue.enqueue).toHaveBeenCalledWith(message);
  });

  it("doesn't queue what can't be sent", async () => {
    const queue = {
      queues: true,
      enqueue: vi.fn(),
    };
    const delivery = {
      check: vi.fn().mockRejectedValue(new InvalidRecipientError("x")),
    };
    await expect(
      new SendEmailHandler(
        delivery as unknown as EmailDelivery,
        queue as MailQueue,
      ).execute(new SendEmailCommand(message)),
    ).rejects.toThrow(InvalidRecipientError);
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});
