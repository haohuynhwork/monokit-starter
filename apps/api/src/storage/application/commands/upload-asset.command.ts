import { Command } from "@nestjs/cqrs";
import type { Actor, AssetVisibility } from "../../domain/asset.js";
import type { FilePolicy } from "../../domain/file-policy.js";

// Stores a file in a folder (null: the root) and returns the new asset's id
export class UploadAssetCommand extends Command<bigint> {
  constructor(
    readonly content: Buffer,
    readonly filename: string,
    readonly policy: FilePolicy,
    readonly visibility: AssetVisibility,
    readonly actor: Actor,
    readonly parentId: bigint | null = null,
  ) {
    super();
  }
}
