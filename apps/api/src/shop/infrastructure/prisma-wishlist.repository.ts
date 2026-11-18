import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import type { WishlistRepository } from "../domain/shop.repository.js";

@Injectable()
export class PrismaWishlistRepository implements WishlistRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async productStatus(
    productId: bigint,
  ): Promise<"draft" | "active" | "archived" | null> {
    const row = await this.db.orm.public.Product.select("status")
      .where({
        id: productId,
      })
      .where((p) => p.deletedAt.isNull())
      .first();
    return row?.status ?? null;
  }

  async productStatuses(
    productIds: bigint[],
  ): Promise<Map<bigint, "draft" | "active" | "archived">> {
    if (!productIds.length) {
      return new Map();
    }
    const rows = await this.db.orm.public.Product.select("id", "status")
      .where((p) => p.id.in(productIds))
      .where((p) => p.deletedAt.isNull())
      .all();
    return new Map(
      rows.map((r) => [
        r.id,
        r.status,
      ]),
    );
  }

  async add(userId: bigint, productId: bigint): Promise<void> {
    await this.db.execute(
      this.db.raw
        .sql`INSERT INTO "public"."WishlistItem" ("userId", "productId")
        VALUES (${userId}, ${productId})
        ON CONFLICT DO NOTHING`
        .affectedCount()
        .build(),
    );
  }

  async remove(userId: bigint, productId: bigint): Promise<void> {
    await this.db.orm.public.WishlistItem.where({
      userId,
      productId,
    }).deleteAll();
  }
}
