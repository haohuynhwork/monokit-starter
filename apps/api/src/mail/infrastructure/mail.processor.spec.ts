import type { Job } from "bullmq";
import { UnrecoverableError } from "bullmq";
import type { EmailDelivery } from "../application/email-delivery.js";
import {
  InvalidRecipientError,
  MailDeliveryError,
  MailNotConfiguredError,
} from "../domain/mail.errors.js";
import type { EmailMessage } from "../domain/mailer.js";
import { MailProcessor } from "./mail.processor.js";
import { valkeyConnection } from "./valkey-connection.js";

const job = {
  data: {
    to: "a@b.c",
    subject: "s",
    text: "t",
  },
} as Job<EmailMessage>;

const processor = (error?: Error) =>
  new MailProcessor({
    deliver: error
      ? vi.fn().mockRejectedValue(error)
      : vi.fn().mockResolvedValue(undefined),
  } as unknown as EmailDelivery);

describe("MailProcessor", () => {
  it("delivers the job", async () => {
    await expect(processor().process(job)).resolves.toBeUndefined();
  });

  it("retries provider failures", async () => {
    const error = new MailDeliveryError("timeout");
    await expect(processor(error).process(job)).rejects.toBe(error);
  });

  it("gives up at once on what retrying won't fix", async () => {
    await expect(
      processor(new MailNotConfiguredError()).process(job),
    ).rejects.toThrow(UnrecoverableError);
    await expect(
      processor(new InvalidRecipientError("x")).process(job),
    ).rejects.toThrow(UnrecoverableError);
  });
});

describe("valkeyConnection", () => {
  it("reads host, port, credentials, db and TLS from the URL", () => {
    expect(valkeyConnection("valkeys://u:p%40ss@cache:6380/2")).toEqual({
      host: "cache",
      port: 6380,
      username: "u",
      password: "p@ss",
      db: 2,
      tls: {},
    });
    expect(valkeyConnection("valkey://localhost")).toMatchObject({
      port: 6379,
      db: 0,
    });
    expect(valkeyConnection("valkey://localhost")).not.toHaveProperty("tls");
  });

  it("accepts redis:// and rediss:// URLs, and nothing else", () => {
    expect(valkeyConnection("rediss://cache")).toHaveProperty("tls");
    expect(valkeyConnection("redis://cache")).not.toHaveProperty("tls");
    expect(() => valkeyConnection("http://cache")).toThrow(/VALKEY_URL/);
  });
});
