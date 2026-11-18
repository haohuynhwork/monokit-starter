import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/asset.js";

// Into another folder (null: the root), with everything inside it
export class MoveAssetCommand extends Command<void> {
  constructor(
    readonly assetId: bigint,
    readonly parentId: bigint | null,
    readonly actor: Actor,
  ) {
    super();
  }
}
