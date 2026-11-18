import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { SendEmailHandler } from "./application/commands/send-email.handler.js";
import { SendTestEmailHandler } from "./application/commands/send-test-email.handler.js";
import { EmailDelivery } from "./application/email-delivery.js";
import { MAIL_QUEUE, MAILER } from "./domain/mailer.js";
import { MailResolver } from "./graphql/mail.resolver.js";
import { MailController } from "./http/mail.controller.js";
import {
  BullMqMailQueue,
  MAIL_JOB_OPTIONS,
  MAIL_QUEUE_NAME,
} from "./infrastructure/bullmq-mail.queue.js";
import { DriverMailer } from "./infrastructure/driver.mailer.js";
import { InlineMailQueue } from "./infrastructure/inline-mail.queue.js";
import { MailProcessor } from "./infrastructure/mail.processor.js";
import { useValkeyClient } from "./infrastructure/valkey-client.js";
import { valkeyConnection } from "./infrastructure/valkey-connection.js";

// With VALKEY_URL, mail goes through a BullMQ queue and a worker in this
// process; without it, it's delivered in the request (ideas/mail "Queue")
const VALKEY_URL = process.env.VALKEY_URL;
// Start of every BullMQ key ('<prefix>:mail:...'), so apps sharing one
// Valkey stay apart; 'bull' is BullMQ's own default
const BULLMQ_PREFIX = process.env.BULLMQ_PREFIX || "bull";
if (!/^[\w.-]+$/.test(BULLMQ_PREFIX)) {
  throw new Error(
    `BULLMQ_PREFIX may only hold letters, digits, _ . - (got "${BULLMQ_PREFIX}")`,
  );
}
if (VALKEY_URL) {
  // Before BullModule opens its connections
  useValkeyClient();
}

@Module({
  imports: VALKEY_URL
    ? [
        BullModule.forRoot({
          connection: valkeyConnection(VALKEY_URL),
          prefix: BULLMQ_PREFIX,
        }),
        BullModule.registerQueue({
          name: MAIL_QUEUE_NAME,
          prefix: BULLMQ_PREFIX,
          defaultJobOptions: MAIL_JOB_OPTIONS,
          // Adding fails at once while Valkey is down, instead of being
          // buffered and sent after the caller was told it failed. The
          // worker keeps its own connection, which waits and reconnects.
          connection: {
            ...valkeyConnection(VALKEY_URL),
            enableOfflineQueue: false,
          },
        }),
      ]
    : [],
  controllers: [
    MailController,
  ],
  providers: [
    {
      provide: MAILER,
      useClass: DriverMailer,
    },
    EmailDelivery,
    ...(VALKEY_URL
      ? [
          {
            provide: MAIL_QUEUE,
            useClass: BullMqMailQueue,
          },
          MailProcessor,
        ]
      : [
          {
            provide: MAIL_QUEUE,
            useClass: InlineMailQueue,
          },
        ]),
    SendEmailHandler,
    SendTestEmailHandler,
    MailResolver,
  ],
})
export class MailModule {}
