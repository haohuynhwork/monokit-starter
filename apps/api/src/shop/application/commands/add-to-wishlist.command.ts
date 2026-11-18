import { Command } from "@nestjs/cqrs";

// Saves a product on sale to the user's wishlist (again is fine)
export class AddToWishlistCommand extends Command<void> {
  constructor(
    readonly userId: bigint,
    readonly productId: bigint,
  ) {
    super();
  }
}
