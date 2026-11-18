import type { RequestMeta } from "../../../common/domain/actor.js";

// Raised after checkout commits; notifications tells the staff, the cart
// lets go of what was bought
export class OrderPlacedEvent {
  constructor(
    readonly orderId: bigint,
    readonly userId: bigint,
    // Minor units, with the currency to format it
    readonly total: bigint,
    readonly currency: string,
    // What was bought; the cart drops these
    readonly variantIds: bigint[],
    // Request context, for audit
    readonly meta?: RequestMeta,
  ) {}
}
