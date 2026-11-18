import { Command } from "@nestjs/cqrs";
import type { Actor, AssetVisibility } from "../../domain/asset.js";

// Returns the new folder's id
export class CreateFolderCommand extends Command<bigint> {
  constructor(
    readonly parentId: bigint | null,
    readonly name: string,
    readonly actor: Actor,
    readonly visibility: AssetVisibility = "private",
  ) {
    super();
  }
}
