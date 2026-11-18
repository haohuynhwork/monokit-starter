import { Query } from "@nestjs/cqrs";
import type { OrderStatus } from "../../domain/order.js";
import type { OrderSummary } from "./shop.view.js";

export interface OrderPage {
  items: OrderSummary[];
  total: number;
}

// Newest first. userId set: that customer's orders only (/me/orders).
// q: an order number, or part of the recipient's name or phone.
export class ListOrdersQuery extends Query<OrderPage> {
  constructor(
    readonly filter: {
      userId?: bigint;
      status?: OrderStatus;
      q?: string;
    },
    readonly limit: number,
    readonly offset: number,
  ) {
    super();
  }
}
