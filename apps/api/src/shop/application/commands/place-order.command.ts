import { Command } from "@nestjs/cqrs";
import type { RequestMeta } from "../../../common/domain/actor.js";
import type { PaymentMethod } from "../../domain/order.js";

// Checkout; returns the new order id
export class PlaceOrderCommand extends Command<bigint> {
  constructor(
    readonly userId: bigint,
    readonly items: {
      variantId: bigint;
      quantity: number;
    }[],
    readonly addressId: bigint,
    readonly paymentMethod: PaymentMethod,
    readonly note: string | null,
    // Absent: bill the shipping address. addressId null: the shipping
    // address too, with company details.
    readonly billing: {
      addressId: bigint | null;
      company: string | null;
      taxCode: string | null;
    } | null = null,
    // Request context, for audit
    readonly meta?: RequestMeta,
  ) {
    super();
  }
}
