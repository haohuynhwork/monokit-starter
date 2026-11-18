import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { toSelf } from "../../domain/notification.js";
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
  REALTIME_PUBLISHER,
  type RealtimePublisher,
} from "../../domain/notification.repository.js";
import type { NotificationView } from "../queries/notification.view.js";
import { SendTestNotificationCommand } from "./send-test-notification.command.js";

@CommandHandler(SendTestNotificationCommand)
export class SendTestNotificationHandler
  implements ICommandHandler<SendTestNotificationCommand>
{
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: RealtimePublisher,
  ) {}

  async execute({ userId }: SendTestNotificationCommand): Promise<bigint> {
    const [stored] = await this.notifications.createMany([
      toSelf(userId, "test", {}),
    ]);
    const view: NotificationView = {
      id: String(stored!.id),
      type: stored!.type,
      data: stored!.data,
      actor: null,
      createdAt: stored!.createdAt,
      read: false,
    };
    this.realtime.toUser(userId, "notification", view);
    return stored!.id;
  }
}
