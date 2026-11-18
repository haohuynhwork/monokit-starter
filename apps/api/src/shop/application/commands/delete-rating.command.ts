import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/shop.js";

// Own rating of a product, or any rating by id (admin)
export class DeleteRatingCommand extends Command<void> {
  constructor(
    readonly target:
      | {
          ratingId: bigint;
        }
      | {
          productId: bigint;
        },
    readonly actor: Actor,
  ) {
    super();
  }
}
