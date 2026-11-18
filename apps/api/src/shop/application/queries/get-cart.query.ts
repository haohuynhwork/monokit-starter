import { Query } from "@nestjs/cqrs";
import type { CartView } from "./shop.view.js";

// The user's cart with today's prices and stock
export class GetCartQuery extends Query<CartView> {
  constructor(readonly userId: bigint) {
    super();
  }
}
