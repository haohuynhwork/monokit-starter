import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { type Job, UnrecoverableError } from "bullmq";
import { EmailDelivery } from "../application/email-delivery.js";
import {
  InvalidRecipientError,
  MailNotConfiguredError,
} from "../domain/mail.errors.js";
import type { EmailMessage } from "../domain/mailer.js";
import { MAIL_QUEUE_NAME } from "./bullmq-mail.queue.js";

// Runs in the api process. Provider failures retry (MAIL_JOB_OPTIONS); a bad
// address or mail turned off since queueing won't get better, so those
// fail at once.
@Processor(MAIL_QUEUE_NAME, {
  concurrency: 5,
})
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger("MailQueue");

  constructor(private readonly delivery: EmailDelivery) {
    super();
  }

  async process(job: Job<EmailMessage>): Promise<void> {
    try {
      await this.delivery.deliver(job.data);
    } catch (error) {
      if (
        error instanceof InvalidRecipientError ||
        error instanceof MailNotConfiguredError
      ) {
        throw new UnrecoverableError(error.message);
      }
      throw error;
    }
  }

  // Recipient and reason only; never the body (reset links, messages)
  @OnWorkerEvent("failed")
  onFailed(job: Job<EmailMessage> | undefined, error: Error): void {
    if (!job) {
      return;
    }
    const final =
      error instanceof UnrecoverableError ||
      job.attemptsMade >= (job.opts.attempts ?? 1);
    this.logger.warn(
      `Job ${job.id} to ${job.data.to}, attempt ${job.attemptsMade}${final ? " (giving up)" : ""}: ${error.message}`,
    );
  }
}
