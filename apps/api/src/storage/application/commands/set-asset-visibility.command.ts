import { Command } from "@nestjs/cqrs";
import type { Actor, AssetVisibility } from "../../domain/asset.js";

// Each asset decides for itself; a folder's visibility is not inherited
export class SetAssetVisibilityCommand extends Command<void> {
  constructor(
    readonly assetId: bigint,
    readonly visibility: AssetVisibility,
    readonly actor: Actor,
  ) {
    super();
  }
}
