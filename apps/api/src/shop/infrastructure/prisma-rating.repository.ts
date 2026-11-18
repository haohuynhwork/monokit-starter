import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import type { RatingRepository } from "../domain/shop.repository.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// The product's ratingCount / ratingSum change in the same transaction
@Injectable()
export class PrismaRatingRepository implements RatingRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  upsert(
    productId: bigint,
    userId: bigint,
    rating: {
      stars: number;
      body: string | null;
    },
  ): Promise<void> {
    return this.db.transaction(async (tx) => {
      const old = await tx.orm.public.ProductRating.select("id", "stars")
        .where({
          productId,
          userId,
        })
        .forUpdate()
        .first();
      if (old) {
        await tx.orm.public.ProductRating.where({
          id: old.id,
        }).update(rating);
      } else {
        await tx.orm.public.ProductRating.create({
          productId,
          userId,
          ...rating,
        });
      }
      await this.adjust(
        tx,
        productId,
        old ? 0 : 1,
        rating.stars - (old?.stars ?? 0),
      );
    });
  }

  delete(
    where:
      | {
          id: bigint;
        }
      | {
          productId: bigint;
          userId: bigint;
        },
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const row = await tx.orm.public.ProductRating.where(where)
        .select("productId", "stars")
        .delete();
      if (!row) {
        return false;
      }
      await this.adjust(tx, row.productId, -1, -row.stars);
      return true;
    });
  }

  private async adjust(tx: Tx, productId: bigint, count: number, sum: number) {
    await tx.execute(
      tx.raw.sql`UPDATE "public"."Product"
        SET "ratingCount" = "ratingCount" + ${count}, "ratingSum" = "ratingSum" + ${sum}
        WHERE "id" = ${productId}`
        .affectedCount()
        .build(),
    );
  }
}
