import { Query } from "@nestjs/cqrs";

export interface UsedAsset {
  assetId: string;
  url: string | null;
}

// Per owner id (as a string), its assets in that slot, in order. One query
// for many owners, e.g. avatars of a page of users.
export class GetAssetUsagesQuery extends Query<Map<string, UsedAsset[]>> {
  constructor(
    readonly ownerType: string,
    readonly ownerIds: bigint[],
    readonly slot: string,
    readonly viewerId: bigint | null = null,
  ) {
    super();
  }
}
