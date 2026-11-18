import { Query } from "@nestjs/cqrs";
import type { Actor } from "../../domain/asset.js";

// Throws AssetForbiddenError when the asset (null: the root) is, or sits
// below, an entity's folder the actor may not use. The system (null actor)
// passes.
export class CheckFolderAccessQuery extends Query<void> {
  constructor(
    readonly assetId: bigint | null,
    readonly actor: Actor,
  ) {
    super();
  }
}
