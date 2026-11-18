import { Inject, Injectable } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { GetConfigQuery } from "../../configs/application/queries/get-config.query.js";
import {
  InvalidRecipientError,
  MailNotConfiguredError,
} from "../domain/mail.errors.js";
import {
  type EmailMessage,
  MAILER,
  type Mailer,
  type MailTransport,
} from "../domain/mailer.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The checks and the actual send, shared by SendEmailCommand (checks, then
// queues), the queue worker and the test email (both deliver)
@Injectable()
export class EmailDelivery {
  constructor(
    private readonly queries: QueryBus,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  // Throws InvalidRecipientError or MailNotConfiguredError
  async check(message: EmailMessage): Promise<MailTransport> {
    if (!EMAIL.test(message.to)) {
      throw new InvalidRecipientError(message.to);
    }
    // Read on every send, so a settings change applies without a restart
    // (and to mail already queued)
    const transport = (await this.queries.execute(new GetConfigQuery())).mail;
    if (!transport) {
      throw new MailNotConfiguredError();
    }
    return transport;
  }

  // Also throws MailDeliveryError when the provider refuses
  async deliver(message: EmailMessage): Promise<void> {
    await this.mailer.send(await this.check(message), message);
  }
}
