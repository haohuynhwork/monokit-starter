import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import { sqlError } from "../../common/infrastructure/sql-error.js";
import { Category } from "../domain/category.js";
import { CategorySlugTakenError } from "../domain/shop.errors.js";
import type { CategoryRepository } from "../domain/shop.repository.js";

const FIELDS = [
  "id",
  "parentId",
  "name",
  "slug",
  "position",
  "deletedAt",
] as const;

@Injectable()
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async findById(id: bigint): Promise<Category | null> {
    const row = await this.db.orm.public.ProductCategory.select(...FIELDS)
      .where({
        id,
      })
      .where((c) => c.deletedAt.isNull())
      .first();
    return row ? Category.restore(row) : null;
  }

  async ancestorIds(id: bigint): Promise<bigint[]> {
    const rows = await this.db.query(
      this.db.raw.sql`WITH RECURSIVE up AS (
          SELECT "id", "parentId", 0 AS "depth" FROM "public"."ProductCategory" WHERE "id" = ${id}
          UNION ALL
          SELECT c."id", c."parentId", up."depth" + 1 FROM "public"."ProductCategory" c
          JOIN up ON c."id" = up."parentId" WHERE up."depth" < 100
        ) SELECT "id" FROM up ORDER BY "depth"`
        .returnsRow({
          id: "pg/int8@1",
        })
        .build(),
    );
    return rows.map((r) => BigInt(String(r.id)));
  }

  async isInUse(id: bigint): Promise<boolean> {
    const [child, product] = await Promise.all([
      this.db.orm.public.ProductCategory.select("id")
        .where({
          parentId: id,
        })
        .where((c) => c.deletedAt.isNull())
        .first(),
      this.db.orm.public.Product.select("id")
        .where({
          categoryId: id,
        })
        .where((p) => p.deletedAt.isNull())
        .first(),
    ]);
    return child !== null || product !== null;
  }

  async save(category: Category): Promise<void> {
    const { id, ...props } = category.snapshot();
    try {
      if (id === null) {
        const row =
          await this.db.orm.public.ProductCategory.select("id").create(props);
        category.assignId(row.id);
      } else {
        await this.db.orm.public.ProductCategory.where({
          id,
        }).update(props);
      }
    } catch (error) {
      if (sqlError(error)?.sqlState === "23505") {
        throw new CategorySlugTakenError();
      }
      throw error;
    }
  }
}
