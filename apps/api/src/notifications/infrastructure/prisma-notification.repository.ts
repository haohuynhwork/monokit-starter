import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import type { NewNotification } from "../domain/notification.js";
import type {
  NotificationRepository,
  StoredNotification,
} from "../domain/notification.repository.js";

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  createMany(rows: NewNotification[]): Promise<StoredNotification[]> {
    return this.db.transaction(async (tx) => {
      const stored: StoredNotification[] = [];
      for (const row of rows) {
        const created = await tx.orm.public.Notification.select(
          "id",
          "createdAt",
        ).create({
          recipientId: row.recipientId,
          type: row.type,
          data: row.data,
          actorId: row.actorId,
        });
        stored.push({
          ...row,
          ...created,
        });
      }
      return stored;
    });
  }

  async markRead(id: bigint, recipientId: bigint): Promise<boolean> {
    const row = await this.db.orm.public.Notification.where({
      id,
      recipientId,
    })
      .where((n) => n.readAt.isNull())
      .select("id")
      .update({
        readAt: new Date().toISOString(),
      });
    return row !== null;
  }

  async delete(
    id: bigint,
    recipientId: bigint,
  ): Promise<{
    wasUnread: boolean;
  } | null> {
    const row = await this.db.orm.public.Notification.where({
      id,
      recipientId,
    })
      .select("readAt")
      .delete();
    return row
      ? {
          wasUnread: row.readAt === null,
        }
      : null;
  }

  async deleteRead(recipientId: bigint): Promise<number> {
    return this.db.orm.public.Notification.where({
      recipientId,
    })
      .where((n) => n.readAt.isNotNull())
      .deleteAndCount();
  }

  async markUnread(id: bigint, recipientId: bigint): Promise<boolean> {
    const row = await this.db.orm.public.Notification.where({
      id,
      recipientId,
    })
      .where((n) => n.readAt.isNotNull())
      .select("id")
      .update({
        readAt: null,
      });
    return row !== null;
  }

  async markAllRead(recipientId: bigint): Promise<number> {
    return this.db.orm.public.Notification.where({
      recipientId,
    })
      .where((n) => n.readAt.isNull())
      .updateAndCount({
        readAt: new Date().toISOString(),
      });
  }
}
