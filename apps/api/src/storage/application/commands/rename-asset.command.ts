import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/asset.js";

// New display name; the slug (and every path below it) follows
export class RenameAssetCommand extends Command<void> {
  constructor(
    readonly assetId: bigint,
    readonly name: string,
    readonly actor: Actor,
  ) {
    super();
  }
}
