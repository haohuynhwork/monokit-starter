import { Query } from "@nestjs/cqrs";

// URL to show the asset; null when it does not exist. Private files need a
// viewer, who the signed link is issued to.
export class GetAssetUrlQuery extends Query<string | null> {
  constructor(
    readonly assetId: bigint,
    readonly viewerId: bigint | null = null,
  ) {
    super();
  }
}
