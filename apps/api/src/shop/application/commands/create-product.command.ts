import { Command } from "@nestjs/cqrs";
import type { ProductInput, VariantInput } from "../../domain/product.js";
import type { Actor } from "../../domain/shop.js";

export class CreateProductCommand extends Command<bigint> {
  constructor(
    readonly input: ProductInput & {
      name: string;
      slug: string;
      variants: VariantInput[];
    },
    readonly actor: Actor,
  ) {
    super();
  }
}
