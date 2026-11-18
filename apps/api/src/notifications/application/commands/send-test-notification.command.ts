import { Command } from "@nestjs/cqrs";

// A 'test' notification to the user themselves, stored and pushed live like
// a real one; returns its id
export class SendTestNotificationCommand extends Command<bigint> {
  constructor(readonly userId: bigint) {
    super();
  }
}
