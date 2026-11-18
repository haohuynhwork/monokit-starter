import { Query } from "@nestjs/cqrs";
import type { OrderView } from "./shop.view.js";

// With items and the timeline. userId set: null unless it's theirs.
export class GetOrderQuery extends Query<OrderView | null> {
  constructor(
    readonly orderId: bigint,
    readonly userId?: bigint,
  ) {
    super();
  }
}
