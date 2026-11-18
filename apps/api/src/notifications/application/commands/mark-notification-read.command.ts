import { Command } from "@nestjs/cqrs";

// Only the recipient's own notifications; a missing one is not an error
export class MarkNotificationReadCommand extends Command<void> {
  constructor(
    readonly notificationId: bigint,
    readonly userId: bigint,
  ) {
    super();
  }
}
