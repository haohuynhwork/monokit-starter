import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import { or } from "@prisma/orm-postgres/orm-client";
import { Session } from "../domain/session.js";
import type { SessionRepository } from "../domain/session.repository.js";

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async findById(id: bigint): Promise<Session | null> {
    const row = await this.db.orm.public.UserSession.where({
      id,
    }).first();
    return row ? Session.restore(row) : null;
  }

  async findByTokenHash(hash: string): Promise<Session | null> {
    const row = await this.db.orm.public.UserSession.where((s) =>
      or(s.tokenHash.eq(hash), s.previousTokenHash.eq(hash)),
    ).first();
    return row ? Session.restore(row) : null;
  }

  async save(session: Session): Promise<void> {
    const { id, ...props } = session.snapshot();
    if (id === null) {
      const row =
        await this.db.orm.public.UserSession.select("id").create(props);
      session.assignId(row.id);
    } else {
      await this.db.orm.public.UserSession.where({
        id,
      }).update(props);
    }
  }

  async revokeAllForUser(userId: bigint, now: Date): Promise<void> {
    await this.db.orm.public.UserSession.where({
      userId,
    })
      .where((s) => s.revokedAt.isNull())
      .updateAll({
        revokedAt: now.toISOString(),
      });
  }
}
