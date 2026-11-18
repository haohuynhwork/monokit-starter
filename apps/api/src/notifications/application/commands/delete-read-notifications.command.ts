import { Command } from "@nestjs/cqrs";

// Clears the user's read notifications; unread ones stay
export class DeleteReadNotificationsCommand extends Command<void> {
  constructor(readonly userId: bigint) {
    super();
  }
}
