import { Inject } from "@nestjs/common";
import {
  CommandBus,
  CommandHandler,
  type ICommandHandler,
  QueryBus,
} from "@nestjs/cqrs";
import { GetUserQuery } from "../../../users/application/queries/get-user.query.js";
import { InvalidRecipientError } from "../../domain/mail.errors.js";
import {
  type EmailMessage,
  MAIL_QUEUE,
  type MailQueue,
} from "../../domain/mailer.js";
import { EmailDelivery } from "../email-delivery.js";
import { SendEmailCommand } from "./send-email.command.js";
import { SendTestEmailCommand } from "./send-test-email.command.js";

// sync: skips the queue, so a wrong setting shows up as
// mail_delivery_failed right away. Otherwise it goes the way real mail
// does (SendEmailCommand): checked now, delivered by the worker, and a
// provider failure only shows in the logs after retries.
@CommandHandler(SendTestEmailCommand)
export class SendTestEmailHandler
  implements ICommandHandler<SendTestEmailCommand>
{
  constructor(
    private readonly delivery: EmailDelivery,
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
    @Inject(MAIL_QUEUE) private readonly queue: MailQueue,
  ) {}

  async execute({ actorId, sync, to }: SendTestEmailCommand): Promise<{
    to: string;
    queued: boolean;
  }> {
    const recipient =
      to?.trim() ||
      (await this.queries.execute(new GetUserQuery(actorId)))?.email;
    if (!recipient) {
      throw new InvalidRecipientError("");
    }
    const message: EmailMessage = {
      to: recipient,
      subject: "Test email",
      text: sync
        ? "Your outgoing email settings work."
        : "Your outgoing email settings and the mail queue work.",
    };
    if (sync) {
      await this.delivery.deliver(message);
    } else {
      await this.commands.execute(new SendEmailCommand(message));
    }
    return {
      to: recipient,
      // Without Valkey, SendEmailCommand delivers in the request too
      queued: !sync && this.queue.queues,
    };
  }
}
