import type { QueryBus } from "@nestjs/cqrs";
import type { Db } from "@packages/nest";
import type { CartLine } from "../../domain/cart.js";
import {
  type CartLineView,
  type CartView,
  PRODUCT_FIELDS,
  toProductViews,
  toPublicProduct,
} from "./shop.view.js";

// Lines (a user's cart, or a guest's from the browser) priced and checked
// as the public shop shows them now
export async function priceCart(
  lines: CartLine[],
  db: Db,
  queries: QueryBus,
): Promise<CartView> {
  if (!lines.length) {
    return {
      items: [],
      count: 0,
      subtotal: "0",
    };
  }
  // Soft-deleted variants too, to name their product
  const variants = await db.orm.public.ProductVariant.select("id", "productId")
    .where((v) => v.id.in(lines.map((l) => l.variantId)))
    .all();
  const productOf = new Map(
    variants.map((v) => [
      v.id,
      v.productId,
    ]),
  );
  const rows = await db.orm.public.Product.select(...PRODUCT_FIELDS)
    .where((p) =>
      p.id.in([
        ...new Set(variants.map((v) => v.productId)),
      ]),
    )
    .where((p) => p.deletedAt.isNull())
    .all();
  const products = new Map(
    (await toProductViews(rows, db, queries)).map((p) => [
      p.id,
      toPublicProduct(p),
    ]),
  );

  let subtotal = 0n;
  const items = lines.map((line): CartLineView => {
    const productId = productOf.get(line.variantId);
    const product =
      productId === undefined ? undefined : products.get(String(productId));
    const variant =
      product?.variants.find((v) => v.id === String(line.variantId)) ?? null;
    const problem =
      !product || !variant || product.status !== "active"
        ? "No longer available"
        : !variant.inStock
          ? "Out of stock"
          : variant.stock !== null && variant.stock < line.quantity
            ? `Only ${variant.stock} left`
            : null;
    const lineTotal =
      problem === null && variant
        ? BigInt(variant.price) * BigInt(line.quantity)
        : 0n;
    subtotal += lineTotal;
    return {
      variantId: String(line.variantId),
      quantity: line.quantity,
      product: product
        ? {
            id: product.id,
            name: product.name,
            slug: product.slug,
          }
        : null,
      variant,
      available: problem === null,
      problem,
      lineTotal: String(lineTotal),
    };
  });
  return {
    items,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: String(subtotal),
  };
}
