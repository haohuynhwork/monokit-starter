import { Injectable, Logger } from "@nestjs/common";
import type { EmailMessage, Mailer, MailTransport } from "../domain/mailer.js";
import { fromHeader } from "./from-header.js";
import { sendResend } from "./resend.sender.js";
import { sendSmtp } from "./smtp.sender.js";

// Sends through whichever driver the 'mail' setting names
@Injectable()
export class DriverMailer implements Mailer {
  private readonly logger = new Logger("Mail");

  async send(t: MailTransport, message: EmailMessage): Promise<void> {
    switch (t.driver) {
      case "smtp":
        return sendSmtp(t, message);
      case "resend":
        return sendResend(t, message);
      case "log":
        this.logger.log(
          `From: ${fromHeader(t)}\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`,
        );
        return;
    }
  }
}
