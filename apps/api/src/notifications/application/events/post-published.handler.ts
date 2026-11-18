import { Inject, Logger } from "@nestjs/common";
import { EventsHandler, type IEventHandler, QueryBus } from "@nestjs/cqrs";
import { PostPublishedEvent } from "../../../posts/domain/events/post-published.event.js";
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

// A new post goes live: tell all active staff, except who published it.
// Stored first, then pushed to open tabs.
@EventsHandler(PostPublishedEvent)
export class PostPublishedNotifier
  implements IEventHandler<PostPublishedEvent>
{
  private readonly logger = new Logger(PostPublishedNotifier.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: RealtimePublisher,
    private readonly queries: QueryBus,
  ) {}

  async handle(event: PostPublishedEvent): Promise<void> {
    // Events run outside the request: a failure here must not surface to the
    // publisher, so log it instead
    try {
      const recipients = await this.queries.execute(
        new ListActiveUserIdsQuery(),
      );
      const rows = fanOut(
        recipients,
        "post.published",
        {
          postId: String(event.postId),
          title: event.title,
          path: event.path,
        },
        event.actorId,
      );
      if (rows.length === 0) {
        return;
      }
      const stored = await this.notifications.createMany(rows);
      const actor = await this.queries.execute(new GetUserQuery(event.actorId));
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
      this.logger.error(`Could not notify about post ${event.postId}`, error);
    }
  }
}
