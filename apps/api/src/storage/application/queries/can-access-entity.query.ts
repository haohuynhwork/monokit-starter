import { Query } from "@nestjs/cqrs";
import type { Actor } from "../../domain/asset.js";

// Asks the context that owns an entity (a product) whether the actor may
// use the entity's media folder. Answered by that context's handler; see
// GUARDED_OWNER_TYPES in check-folder-access.handler.ts.
export class CanAccessEntityQuery extends Query<boolean> {
  constructor(
    readonly ownerType: string,
    readonly ownerId: bigint,
    readonly actor: Actor,
  ) {
    super();
  }
}
