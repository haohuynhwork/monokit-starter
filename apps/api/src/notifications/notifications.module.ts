import { Module } from "@nestjs/common";
import { DeleteNotificationHandler } from "./application/commands/delete-notification.handler.js";
import { DeleteReadNotificationsHandler } from "./application/commands/delete-read-notifications.handler.js";
import { MarkAllNotificationsReadHandler } from "./application/commands/mark-all-notifications-read.handler.js";
import { MarkNotificationReadHandler } from "./application/commands/mark-notification-read.handler.js";
import { MarkNotificationUnreadHandler } from "./application/commands/mark-notification-unread.handler.js";
import { SendTestNotificationHandler } from "./application/commands/send-test-notification.handler.js";
import { OrderPlacedNotifier } from "./application/events/order-placed.handler.js";
import { PostPublishedNotifier } from "./application/events/post-published.handler.js";
import { ListNotificationsHandler } from "./application/queries/list-notifications.handler.js";
import {
  NOTIFICATION_REPOSITORY,
  REALTIME_PUBLISHER,
  REALTIME_STREAM,
} from "./domain/notification.repository.js";
import { NotificationsResolver } from "./graphql/notifications.resolver.js";
import { NotificationsController } from "./http/notifications.controller.js";
import { FanOutPublisher } from "./infrastructure/fan-out.publisher.js";
import { PrismaNotificationRepository } from "./infrastructure/prisma-notification.repository.js";
import { PubSubRealtime } from "./infrastructure/pubsub-realtime.js";
import { RealtimeGateway } from "./infrastructure/realtime.gateway.js";

@Module({
  controllers: [
    NotificationsController,
  ],
  providers: [
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: PrismaNotificationRepository,
    },
    RealtimeGateway,
    PubSubRealtime,
    // Pushes go to socket.io (/realtime) and GraphQL subscriptions
    {
      provide: REALTIME_PUBLISHER,
      inject: [
        RealtimeGateway,
        PubSubRealtime,
      ],
      useFactory: (gateway: RealtimeGateway, pubsub: PubSubRealtime) =>
        new FanOutPublisher([
          gateway,
          pubsub,
        ]),
    },
    {
      provide: REALTIME_STREAM,
      useExisting: PubSubRealtime,
    },
    PostPublishedNotifier,
    OrderPlacedNotifier,
    MarkNotificationReadHandler,
    SendTestNotificationHandler,
    MarkNotificationUnreadHandler,
    MarkAllNotificationsReadHandler,
    DeleteNotificationHandler,
    DeleteReadNotificationsHandler,
    ListNotificationsHandler,
    NotificationsResolver,
  ],
})
export class NotificationsModule {}
