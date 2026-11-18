// How mail leaves; mirrors the 'mail' setting (configs)
interface From {
  fromName: string;
  fromEmail: string;
}
export type MailTransport =
  | (From & {
      driver: "smtp";
      host: string;
      port: number;
      secure: boolean;
      username: string;
      password: string;
    })
  | (From & {
      driver: "resend";
      apiKey: string;
    })
  | (From & {
      driver: "log";
    });

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface Mailer {
  // Throws MailDeliveryError when the provider refuses or can't be reached
  send(transport: MailTransport, message: EmailMessage): Promise<void>;
}

export const MAILER = Symbol("MAILER");

// Where SendEmailCommand puts an email: a queue with retries (BullMQ) or,
// without Valkey, delivery right away (ideas/mail "Queue")
export interface MailQueue {
  // false: enqueue delivers right away (no Valkey)
  readonly queues: boolean;
  enqueue(message: EmailMessage): Promise<void>;
}

export const MAIL_QUEUE = Symbol("MAIL_QUEUE");
