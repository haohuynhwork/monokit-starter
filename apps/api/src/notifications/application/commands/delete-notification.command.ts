import { Command } from "@nestjs/cqrs";

// Only the recipient's own; a missing one is not an error
export class DeleteNotificationCommand extends Command<void> {
  constructor(
    readonly notificationId: bigint,
    readonly userId: bigint,
  ) {
    super();
  }
}
