import { Command } from "@nestjs/cqrs";
import type { AssetVisibility } from "../../domain/asset.js";

// A root-level system folder (e.g. 'avatars'), created on first use; returns
// its id
export class EnsureFolderCommand extends Command<bigint> {
  constructor(
    readonly slug: string,
    readonly name: string,
    readonly visibility: AssetVisibility,
  ) {
    super();
  }
}
