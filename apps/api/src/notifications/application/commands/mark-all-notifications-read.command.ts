import { Command } from "@nestjs/cqrs";

export class MarkAllNotificationsReadCommand extends Command<void> {
  constructor(readonly userId: bigint) {
    super();
  }
}
