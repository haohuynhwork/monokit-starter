import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { EmailDelivery } from "../application/email-delivery.js";
import type { EmailMessage, MailQueue } from "../domain/mailer.js";

// Without VALKEY_URL: no queue, delivered in the caller's request as before
@Injectable()
export class InlineMailQueue implements MailQueue, OnModuleInit {
  readonly queues = false;
  private readonly logger = new Logger("Mail");

  constructor(private readonly delivery: EmailDelivery) {}

  onModuleInit(): void {
    this.logger.log("VALKEY_URL is unset: email is sent without a queue");
  }

  enqueue(message: EmailMessage): Promise<void> {
    return this.delivery.deliver(message);
  }
}
