import { Command } from "@nestjs/cqrs";

// Checks the mail setting; `to` defaults to the admin's own address.
// `sync`: deliver in the request (provider errors come back at once) or
// through the queue like real mail (tests the queue and worker too).
export class SendTestEmailCommand extends Command<{
  to: string;
  // It went into the queue (false: delivered already)
  queued: boolean;
}> {
  constructor(
    readonly actorId: bigint,
    readonly sync: boolean,
    readonly to?: string,
  ) {
    super();
  }
}
