import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
  REALTIME_PUBLISHER,
  type RealtimePublisher,
} from "../../domain/notification.repository.js";
import { MarkNotificationReadCommand } from "./mark-notification-read.command.js";

@CommandHandler(MarkNotificationReadCommand)
export class MarkNotificationReadHandler
  implements ICommandHandler<MarkNotificationReadCommand>
{
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: RealtimePublisher,
  ) {}

  async execute({
    notificationId,
    userId,
  }: MarkNotificationReadCommand): Promise<void> {
    if (await this.notifications.markRead(notificationId, userId)) {
      // Other open tabs update their badge
      this.realtime.toUser(userId, "notification:read", {
        id: String(notificationId),
      });
    }
  }
}
