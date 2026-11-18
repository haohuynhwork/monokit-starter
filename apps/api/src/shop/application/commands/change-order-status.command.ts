import { Command } from "@nestjs/cqrs";
import type { OrderStatus } from "../../domain/order.js";
import type { Actor } from "../../domain/shop.js";

// Staff move an order along (see the status diagram in ideas/orders)
export class ChangeOrderStatusCommand extends Command<void> {
  constructor(
    readonly orderId: bigint,
    readonly status: OrderStatus,
    readonly trackingNumber: string | null | undefined,
    readonly actor: Actor,
  ) {
    super();
  }
}
