import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/shop.js";

// Soft delete; past orders keep their copies of name and price
export class DeleteProductCommand extends Command<void> {
  constructor(
    readonly productId: bigint,
    readonly actor: Actor,
  ) {
    super();
  }
}
