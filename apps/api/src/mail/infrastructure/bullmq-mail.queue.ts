import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";
import { MailDeliveryError } from "../domain/mail.errors.js";
import type { EmailMessage, MailQueue } from "../domain/mailer.js";

// The queue's connection doesn't buffer while Valkey is down (see
// mail.module.ts), so add() fails at once; this only caps a slow server
const ENQUEUE_TIMEOUT_MS = 5000;

export const MAIL_QUEUE_NAME = "mail";

// Retries and retention (ideas/mail "Queue"): 6 attempts from 30 s, about
// 30 minutes in all; jobs hold message bodies, so they don't stay long
export const MAIL_JOB_OPTIONS = {
  attempts: 6,
  backoff: {
    type: "exponential",
    delay: 30_000,
  },
  removeOnComplete: {
    age: 60 * 60,
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 60 * 60,
  },
} as const;

@Injectable()
export class BullMqMailQueue implements MailQueue {
  readonly queues = true;

  constructor(
    @InjectQueue(MAIL_QUEUE_NAME) private readonly queue: Queue<EmailMessage>,
  ) {}

  async enqueue(message: EmailMessage): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new MailDeliveryError("the mail queue is unreachable")),
        ENQUEUE_TIMEOUT_MS,
      );
    });
    try {
      await Promise.race([
        this.queue.add("send", message),
        timeout,
      ]);
    } catch (error) {
      throw error instanceof MailDeliveryError
        ? error
        : new MailDeliveryError("the mail queue is unreachable");
    } finally {
      clearTimeout(timer);
    }
  }
}
