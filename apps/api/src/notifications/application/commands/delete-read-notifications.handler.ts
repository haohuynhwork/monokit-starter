import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
  REALTIME_PUBLISHER,
  type RealtimePublisher,
} from "../../domain/notification.repository.js";
import { DeleteReadNotificationsCommand } from "./delete-read-notifications.command.js";

@CommandHandler(DeleteReadNotificationsCommand)
export class DeleteReadNotificationsHandler
  implements ICommandHandler<DeleteReadNotificationsCommand>
{
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: RealtimePublisher,
  ) {}

  async execute({ userId }: DeleteReadNotificationsCommand): Promise<void> {
    if ((await this.notifications.deleteRead(userId)) > 0) {
      this.realtime.toUser(userId, "notification:cleared-read", {});
    }
  }
}
