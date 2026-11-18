import { Query } from "@nestjs/cqrs";
import type { Actor } from "../../domain/asset.js";
import type { AssetView } from "./asset.view.js";

// By id, or by path (full slug, exact match); null when missing
export class GetAssetQuery extends Query<AssetView | null> {
  constructor(
    readonly by:
      | {
          id: bigint;
        }
      | {
          path: string;
        },
    readonly viewerId: bigint | null,
    // null: the system, unchecked
    readonly actor: Actor = null,
  ) {
    super();
  }
}
