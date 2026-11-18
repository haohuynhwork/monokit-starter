import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/shop.js";

// The product's folder in the media library; returns its id
export class EnsureProductFolderCommand extends Command<bigint> {
  constructor(
    readonly productId: bigint,
    readonly actor: Actor,
  ) {
    super();
  }
}
