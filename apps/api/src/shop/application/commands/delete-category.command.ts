import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/shop.js";

// Refused while it has live subcategories or products
export class DeleteCategoryCommand extends Command<void> {
  constructor(
    readonly categoryId: bigint,
    readonly actor: Actor,
  ) {
    super();
  }
}
