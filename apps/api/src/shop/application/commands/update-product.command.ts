import { Command } from "@nestjs/cqrs";
import type { ProductInput } from "../../domain/product.js";
import type { Actor } from "../../domain/shop.js";

export class UpdateProductCommand extends Command<void> {
  constructor(
    readonly productId: bigint,
    readonly input: ProductInput,
    readonly actor: Actor,
  ) {
    super();
  }
}
