import { Command } from "@nestjs/cqrs";
import type { EmailMessage } from "../../domain/mailer.js";

// Sends one email through the 'mail' setting. Other contexts send mail
// only through this command.
export class SendEmailCommand extends Command<void> {
  constructor(readonly message: EmailMessage) {
    super();
  }
}
