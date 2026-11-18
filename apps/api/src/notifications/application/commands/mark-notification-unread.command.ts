import { Command } from "@nestjs/cqrs";

// Only the recipient's own; a missing or already unread one is not an error
export class MarkNotificationUnreadCommand extends Command<void> {
  constructor(
    readonly notificationId: bigint,
    readonly userId: bigint,
  ) {
    super();
  }
}
