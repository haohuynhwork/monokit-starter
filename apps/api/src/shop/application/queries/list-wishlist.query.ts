import { Query } from "@nestjs/cqrs";
import type { ProductView } from "./shop.view.js";

// The user's saved products, newest first, as the public shop shows them.
// Products taken off sale stay (status says so); deleted ones drop out.
export class ListWishlistQuery extends Query<ProductView[]> {
  constructor(readonly userId: bigint) {
    super();
  }
}
