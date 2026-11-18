import { Command } from "@nestjs/cqrs";

// The customer cancels their own pending order; stock goes back
export class CancelMyOrderCommand extends Command<void> {
  constructor(
    readonly userId: bigint,
    readonly orderId: bigint,
  ) {
    super();
  }
}
