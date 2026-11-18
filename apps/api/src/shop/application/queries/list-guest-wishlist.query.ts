import { Query } from "@nestjs/cqrs";
import type { ProductView } from "./shop.view.js";

// A guest's saved products (kept by the browser), in their order
export class ListGuestWishlistQuery extends Query<ProductView[]> {
  constructor(readonly productIds: bigint[]) {
    super();
  }
}
