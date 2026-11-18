import { Command } from "@nestjs/cqrs";

// A guest's saved products (kept by the browser) joining the account at
// login
export class MergeWishlistCommand extends Command<void> {
  constructor(
    readonly userId: bigint,
    readonly productIds: bigint[],
  ) {
    super();
  }
}
