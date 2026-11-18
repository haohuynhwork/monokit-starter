import { Command } from "@nestjs/cqrs";
import type { PaymentStatus } from "../../domain/order.js";
import type { Actor } from "../../domain/shop.js";

// Staff record a payment (no gateway yet): paid, refunded, or back to unpaid
export class ChangeOrderPaymentCommand extends Command<void> {
  constructor(
    readonly orderId: bigint,
    readonly paymentStatus: PaymentStatus,
    readonly actor: Actor,
  ) {
    super();
  }
}
