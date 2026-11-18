import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { MAIL_QUEUE, type MailQueue } from "../../domain/mailer.js";
import { EmailDelivery } from "../email-delivery.js";
import { SendEmailCommand } from "./send-email.command.js";

// Checks now (the caller gets invalid_recipient / mail_not_configured),
// then queues; delivery and its retries happen in the worker
@CommandHandler(SendEmailCommand)
export class SendEmailHandler implements ICommandHandler<SendEmailCommand> {
  constructor(
    private readonly delivery: EmailDelivery,
    @Inject(MAIL_QUEUE) private readonly queue: MailQueue,
  ) {}

  async execute({ message }: SendEmailCommand): Promise<void> {
    await this.delivery.check(message);
    await this.queue.enqueue(message);
  }
}
