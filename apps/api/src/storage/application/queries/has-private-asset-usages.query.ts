import { Query } from "@nestjs/cqrs";

// Is any asset used by the owner private? (A public page can't show it.)
export class HasPrivateAssetUsagesQuery extends Query<boolean> {
  constructor(
    readonly ownerType: string,
    readonly ownerId: bigint,
  ) {
    super();
  }
}
