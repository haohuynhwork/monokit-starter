import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/asset.js";

// Deletes the asset and, for a folder, everything inside it. References to
// them are cleared by the FKs (ON DELETE SET NULL); attached ones block it.
export class DeleteAssetCommand extends Command<void> {
  constructor(
    readonly assetId: bigint,
    readonly actor: Actor = null,
  ) {
    super();
  }
}
