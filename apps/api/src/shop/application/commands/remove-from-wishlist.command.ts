import { Command } from "@nestjs/cqrs";

export class RemoveFromWishlistCommand extends Command<void> {
  constructor(
    readonly userId: bigint,
    readonly productId: bigint,
  ) {
    super();
  }
}
