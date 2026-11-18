import { Command } from "@nestjs/cqrs";

// Adds to the variant's line in the user's cart (or starts one)
export class AddToCartCommand extends Command<void> {
  constructor(
    readonly userId: bigint,
    readonly variantId: bigint,
    readonly quantity: number,
  ) {
    super();
  }
}
