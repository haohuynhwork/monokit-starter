import { ProductNotFoundError } from "./shop.errors.js";

// Only products on sale can be saved; ones taken off sale later stay on the
// list (shown as unavailable) until removed (ideas/orders/cart.md)
export function checkWishable(
  product: {
    status: "draft" | "active" | "archived";
  } | null,
): void {
  if (product?.status !== "active") {
    throw new ProductNotFoundError();
  }
}

export const MAX_WISHLIST_MERGE = 100;

// A guest's saved products joining the account at login: only those on
// sale now, the rest are dropped quietly
export function wishableIds(
  statuses: Map<bigint, "draft" | "active" | "archived">,
  productIds: bigint[],
): bigint[] {
  return [
    ...new Set(productIds),
  ]
    .filter((id) => statuses.get(id) === "active")
    .slice(0, MAX_WISHLIST_MERGE);
}
