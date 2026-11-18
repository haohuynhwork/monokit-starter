import { Inject, Logger } from "@nestjs/common";
import { EventsHandler, type IEventHandler, QueryBus } from "@nestjs/cqrs";
import { OrderPlacedEvent } from "../../../shop/domain/events/order-placed.event.js";
import { GetUserQuery } from "../../../users/application/queries/get-user.query.js";
import { ListActiveUserIdsQuery } from "../../../users/application/queries/list-active-user-ids.query.js";
import { fanOut } from "../../domain/notification.js";
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
  REALTIME_PUBLISHER,
  type RealtimePublisher,
} from "../../domain/notification.repository.js";
import type { NotificationView } from "../queries/notification.view.js";

// A new order: tell the staff who handle orders (editors, admins)
@EventsHandler(OrderPlacedEvent)
export class OrderPlacedNotifier implements IEventHandler<OrderPlacedEvent> {
  private readonly logger = new Logger(OrderPlacedNotifier.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: RealtimePublisher,
    private readonly queries: QueryBus,
  ) {}

  async handle(event: OrderPlacedEvent): Promise<void> {
    // Outside the request: a failure must not fail the checkout
    try {
      const recipients = await this.queries.execute(
        new ListActiveUserIdsQuery([
          "admin",
          "editor",
        ]),
      );
      const rows = fanOut(
        recipients,
        "order.placed",
        {
          orderId: String(event.orderId),
          total: String(event.total),
          currency: event.currency,
        },
        event.userId,
      );
      if (rows.length === 0) {
        return;
      }
      const stored = await this.notifications.createMany(rows);
      const actor = await this.queries.execute(new GetUserQuery(event.userId));
      for (const n of stored) {
        const view: NotificationView = {
          id: String(n.id),
          type: n.type,
          data: n.data,
          actor: actor
            ? {
                id: actor.id,
                name: actor.shortName ?? actor.displayName,
              }
            : null,
          createdAt: n.createdAt,
          read: false,
        };
        this.realtime.toUser(n.recipientId, "notification", view);
      }
    } catch (error) {
      this.logger.error(`Could not notify about order ${event.orderId}`, error);
    }
  }
}
