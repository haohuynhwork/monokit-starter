import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
  REALTIME_PUBLISHER,
  type RealtimePublisher,
} from "../../domain/notification.repository.js";
import { DeleteNotificationCommand } from "./delete-notification.command.js";

@CommandHandler(DeleteNotificationCommand)
export class DeleteNotificationHandler
  implements ICommandHandler<DeleteNotificationCommand>
{
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: RealtimePublisher,
  ) {}

  async execute({
    notificationId,
    userId,
  }: DeleteNotificationCommand): Promise<void> {
    const deleted = await this.notifications.delete(notificationId, userId);
    if (deleted) {
      // Other open tabs drop it (and lower the badge if it was unread)
      this.realtime.toUser(userId, "notification:deleted", {
        id: String(notificationId),
        wasUnread: deleted.wasUnread,
      });
    }
  }
}
