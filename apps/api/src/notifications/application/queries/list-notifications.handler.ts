import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { GetUserQuery } from "../../../users/application/queries/get-user.query.js";
import type {
  NotificationData,
  NotificationType,
} from "../../domain/notification.js";
import {
  ListNotificationsQuery,
  type NotificationPage,
} from "./list-notifications.query.js";

@QueryHandler(ListNotificationsQuery)
export class ListNotificationsHandler
  implements IQueryHandler<ListNotificationsQuery>
{
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly queries: QueryBus,
  ) {}

  async execute({
    userId,
    limit,
    before,
  }: ListNotificationsQuery): Promise<NotificationPage> {
    const mine = this.db.orm.public.Notification.where({
      recipientId: userId,
    });
    const [rows, { unread }] = await Promise.all([
      mine
        .where((n) => (before === null ? n.id.isNotNull() : n.id.lt(before)))
        .select("id", "type", "data", "actorId", "createdAt", "readAt")
        // Ids grow with time, so this is newest first and a stable cursor
        .orderBy((n) => n.id.desc())
        .limit(limit + 1)
        .all(),
      mine
        .where((n) => n.readAt.isNull())
        .aggregate((a) => ({
          unread: a.count(),
        })),
    ]);
    const page = rows.slice(0, limit);

    // Names are read now, so a renamed user shows their current name
    const actorIds = [
      ...new Set(
        page.flatMap((r) =>
          r.actorId === null
            ? []
            : [
                r.actorId,
              ],
        ),
      ),
    ];
    const actors = new Map<bigint, string>();
    for (const id of actorIds) {
      const user = await this.queries.execute(new GetUserQuery(id));
      if (user) {
        actors.set(id, user.shortName ?? user.displayName);
      }
    }

    return {
      items: page.map((r) => ({
        id: String(r.id),
        type: r.type as NotificationType,
        data: r.data as NotificationData[NotificationType],
        actor:
          r.actorId !== null && actors.has(r.actorId)
            ? {
                id: String(r.actorId),
                name: actors.get(r.actorId)!,
              }
            : null,
        createdAt: r.createdAt,
        read: r.readAt !== null,
      })),
      unread,
      nextCursor: rows.length > limit ? String(page.at(-1)!.id) : null,
    };
  }
}
