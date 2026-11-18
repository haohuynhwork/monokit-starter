import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { and, or } from "@prisma/orm-postgres/orm-client";
import { GetUserQuery } from "../../../users/application/queries/get-user.query.js";
import {
  type AuditEventPage,
  DELETED_USER,
  encodeCursor,
} from "./audit-event.view.js";
import { GetAuditEventsQuery } from "./get-audit-events.query.js";

@QueryHandler(GetAuditEventsQuery)
export class GetAuditEventsHandler
  implements IQueryHandler<GetAuditEventsQuery>
{
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly queries: QueryBus,
  ) {}

  async execute({
    filter,
    limit,
    cursor,
  }: GetAuditEventsQuery): Promise<AuditEventPage> {
    const rows = await this.db.orm.public.AuditEvent.where((e) =>
      filter.entityType ? e.entityType.eq(filter.entityType) : e.id.isNotNull(),
    )
      .where((e) =>
        filter.entityId ? e.entityId.eq(filter.entityId) : e.id.isNotNull(),
      )
      .where((e) =>
        filter.actorId === undefined
          ? e.id.isNotNull()
          : e.actorId.eq(filter.actorId),
      )
      .where((e) =>
        filter.action ? e.action.eq(filter.action) : e.id.isNotNull(),
      )
      .where((e) =>
        filter.from ? e.occurredAt.gte(filter.from) : e.id.isNotNull(),
      )
      .where((e) =>
        filter.to ? e.occurredAt.lte(filter.to) : e.id.isNotNull(),
      )
      .where((e) =>
        cursor === null
          ? e.id.isNotNull()
          : or(
              e.occurredAt.lt(cursor.occurredAt),
              and(e.occurredAt.eq(cursor.occurredAt), e.id.lt(cursor.id)),
            ),
      )
      .select(
        "id",
        "occurredAt",
        "actorId",
        "action",
        "entityType",
        "entityId",
        "data",
        "ip",
        "userAgent",
      )
      .orderBy([
        (e) => e.occurredAt.desc(),
        (e) => e.id.desc(),
      ])
      .limit(limit + 1)
      .all();
    const page = rows.slice(0, limit);

    // Current names; a user that is gone shows as "Deleted user"
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
    const names = new Map<bigint, string>();
    await Promise.all(
      actorIds.map(async (id) => {
        const user = await this.queries.execute(new GetUserQuery(id));
        names.set(id, user ? user.displayName : DELETED_USER);
      }),
    );

    const last = page.at(-1);
    return {
      items: page.map((r) => ({
        id: String(r.id),
        occurredAt: r.occurredAt,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        data: r.data as Record<string, unknown>,
        actor:
          r.actorId === null
            ? null
            : {
                id: String(r.actorId),
                name: names.get(r.actorId) ?? DELETED_USER,
              },
        ip: r.ip,
        userAgent: r.userAgent,
      })),
      nextCursor:
        rows.length > limit && last
          ? encodeCursor({
              occurredAt: last.occurredAt,
              id: last.id,
            })
          : null,
    };
  }
}
