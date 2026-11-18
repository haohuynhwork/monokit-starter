import type { QueryBus } from "@nestjs/cqrs";
import type { Db } from "@packages/nest";
import {
  PRODUCT_FIELDS,
  type ProductView,
  toProductViews,
  toPublicProduct,
} from "./shop.view.js";

// Saved products in the given order, as the public shop shows them;
// deleted ones drop out. `hideDrafts` for a guest's list, which anyone can
// ask for: never-published products stay hidden.
export async function wishlistProducts(
  productIds: bigint[],
  db: Db,
  queries: QueryBus,
  hideDrafts = false,
): Promise<ProductView[]> {
  if (!productIds.length) {
    return [];
  }
  const rows = await db.orm.public.Product.select(...PRODUCT_FIELDS)
    .where((p) => p.id.in(productIds))
    .where((p) => p.deletedAt.isNull())
    .where((p) => (hideDrafts ? p.status.neq("draft") : p.id.isNotNull()))
    .all();
  const byId = new Map(
    (await toProductViews(rows, db, queries)).map((p) => [
      p.id,
      toPublicProduct(p),
    ]),
  );
  return productIds.flatMap((id) => byId.get(String(id)) ?? []);
}
