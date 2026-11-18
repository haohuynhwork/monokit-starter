import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/shop.js";

// parentId: undefined keeps it, null moves to the top level
export class UpdateCategoryCommand extends Command<void> {
  constructor(
    readonly categoryId: bigint,
    readonly input: {
      name?: string;
      slug?: string;
      position?: number;
      parentId?: bigint | null;
    },
    readonly actor: Actor,
  ) {
    super();
  }
}
