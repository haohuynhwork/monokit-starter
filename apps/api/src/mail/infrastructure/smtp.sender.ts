import { createTransport } from "nodemailer";
import { MailDeliveryError } from "../domain/mail.errors.js";
import type { EmailMessage, MailTransport } from "../domain/mailer.js";
import { fromHeader } from "./from-header.js";

type Smtp = Extract<
  MailTransport,
  {
    driver: "smtp";
  }
>;

// A transport per send: the setting may change between sends
export async function sendSmtp(t: Smtp, message: EmailMessage): Promise<void> {
  const transport = createTransport({
    host: t.host,
    port: t.port,
    secure: t.secure,
    auth: t.username
      ? {
          user: t.username,
          pass: t.password,
        }
      : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  try {
    await transport.sendMail({
      from: fromHeader(t),
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  } catch (e) {
    throw new MailDeliveryError(e instanceof Error ? e.message : String(e));
  } finally {
    transport.close();
  }
}
