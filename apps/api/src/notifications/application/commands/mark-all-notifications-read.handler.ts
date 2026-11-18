import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
  REALTIME_PUBLISHER,
  type RealtimePublisher,
} from "../../domain/notification.repository.js";
import { MarkAllNotificationsReadCommand } from "./mark-all-notifications-read.command.js";

@CommandHandler(MarkAllNotificationsReadCommand)
export class MarkAllNotificationsReadHandler
  implements ICommandHandler<MarkAllNotificationsReadCommand>
{
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: RealtimePublisher,
  ) {}

  async execute({ userId }: MarkAllNotificationsReadCommand): Promise<void> {
    if ((await this.notifications.markAllRead(userId)) > 0) {
      this.realtime.toUser(userId, "notification:read-all", {});
    }
  }
}
