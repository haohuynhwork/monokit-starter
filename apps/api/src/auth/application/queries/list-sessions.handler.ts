import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { ListSessionsQuery, type SessionView } from "./list-sessions.query.js";

@QueryHandler(ListSessionsQuery)
export class ListSessionsHandler implements IQueryHandler<ListSessionsQuery> {
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({
    userId,
    currentSessionId,
  }: ListSessionsQuery): Promise<SessionView[]> {
    const rows = await this.db.orm.public.UserSession.select(
      "id",
      "userAgent",
      "ip",
      "createdAt",
      "lastUsedAt",
    )
      .where({
        userId,
      })
      .where((s) => s.revokedAt.isNull())
      .where((s) => s.expiresAt.gt(new Date().toISOString()))
      .orderBy((s) => s.lastUsedAt.desc())
      .all();
    return rows.map((row) => ({
      ...row,
      id: String(row.id),
      current: row.id === currentSessionId,
    }));
  }
}
