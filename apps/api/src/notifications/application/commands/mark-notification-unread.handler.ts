import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
  REALTIME_PUBLISHER,
  type RealtimePublisher,
} from "../../domain/notification.repository.js";
import { MarkNotificationUnreadCommand } from "./mark-notification-unread.command.js";

@CommandHandler(MarkNotificationUnreadCommand)
export class MarkNotificationUnreadHandler
  implements ICommandHandler<MarkNotificationUnreadCommand>
{
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: RealtimePublisher,
  ) {}

  async execute({
    notificationId,
    userId,
  }: MarkNotificationUnreadCommand): Promise<void> {
    if (await this.notifications.markUnread(notificationId, userId)) {
      // Other open tabs raise their badge
      this.realtime.toUser(userId, "notification:unread", {
        id: String(notificationId),
      });
    }
  }
}
