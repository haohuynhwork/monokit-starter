export interface AssetUsageTarget {
  ownerType: string;
  ownerId: bigint;
  slot: string;
}

export interface AssetUsageRow {
  ownerId: bigint;
  assetId: bigint;
  position: number;
}

export interface AssetUsageRepository {
  // Single slot: replaces what was there and returns the replaced asset ids.
  // List: appends; AssetAlreadyUsedError when the asset is already in it.
  attach(
    target: AssetUsageTarget,
    assetId: bigint,
    opts: {
      single: boolean;
      position: number;
    },
  ): Promise<bigint[]>;
  // A list slot becomes exactly `assetIds`, in that order; returns the
  // assets that were removed from it
  replace(target: AssetUsageTarget, assetIds: bigint[]): Promise<bigint[]>;
  // All of the owner's usages, or only one slot's; returns their assets
  detach(
    target: Omit<AssetUsageTarget, "slot"> & {
      slot?: string;
    },
  ): Promise<bigint[]>;
  // Ordered by position, for several owners at once
  list(
    ownerType: string,
    ownerIds: bigint[],
    slot: string,
  ): Promise<AssetUsageRow[]>;
}

export const ASSET_USAGE_REPOSITORY = Symbol("ASSET_USAGE_REPOSITORY");
