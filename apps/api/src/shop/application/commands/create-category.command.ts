import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/shop.js";

export class CreateCategoryCommand extends Command<bigint> {
  constructor(
    readonly input: {
      name: string;
      slug: string;
      parentId: bigint | null;
      position?: number;
    },
    readonly actor: Actor,
  ) {
    super();
  }
}
