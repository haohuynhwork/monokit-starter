import { Command } from "@nestjs/cqrs";

// Sets the quantity of a line already in the user's cart
export class SetCartQuantityCommand extends Command<void> {
  constructor(
    readonly userId: bigint,
    readonly variantId: bigint,
    readonly quantity: number,
  ) {
    super();
  }
}
