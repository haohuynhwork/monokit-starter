import { MailDeliveryError } from "../domain/mail.errors.js";
import type { EmailMessage, MailTransport } from "../domain/mailer.js";
import { fromHeader } from "./from-header.js";

type Resend = Extract<
  MailTransport,
  {
    driver: "resend";
  }
>;

// https://resend.com/docs/api-reference/emails/send-email
export async function sendResend(
  t: Resend,
  message: EmailMessage,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${t.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: fromHeader(t),
        to: [
          message.to,
        ],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    throw new MailDeliveryError(e instanceof Error ? e.message : String(e));
  }
  if (!res.ok) {
    // Errors are { name, message }; fall back to the status line
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new MailDeliveryError(
      `Resend ${res.status}: ${body?.message ?? res.statusText}`,
    );
  }
}
