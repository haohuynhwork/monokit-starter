import type { AssetKind, AssetNode, AssetVisibility } from "./asset.js";

export interface NewAsset {
  // Public key; the repository makes a random '<uuid>' when not given
  key?: string;
  parentId: bigint | null;
  kind: AssetKind;
  visibility: AssetVisibility;
  slug: string;
  filename: string;
  createdById: bigint | null;
  // file
  mimeType?: string;
  sizeBytes?: bigint;
  storage?: string;
  storageKey?: string;
  checksum?: string;
  // link
  url?: string;
}

export interface StoredLocation {
  storage: string;
  storageKey: string;
}

// Each write is one transaction that keeps parentId, fullSlug and the closure
// table consistent. Name clashes throw NameTakenError.
export interface AssetRepository {
  findById(id: bigint): Promise<AssetNode | null>;
  findRootFolder(slug: string): Promise<AssetNode | null>;
  // Is `nodeId` the asset `rootId` or inside it?
  isInSubtree(rootId: bigint, nodeId: bigint): Promise<boolean>;
  // First of `candidates` not used by a sibling under `parentId`
  freeSlug(parentId: bigint | null, candidates: string[]): Promise<string>;

  create(asset: NewAsset): Promise<bigint>;
  rename(id: bigint, slug: string, filename: string): Promise<void>;
  move(id: bigint, parentId: bigint | null): Promise<void>;
  setVisibility(id: bigint, visibility: AssetVisibility): Promise<void>;
  setLinkUrl(id: bigint, url: string): Promise<void>;
  // Deletes the asset and everything inside it; returns their stored bytes so
  // the caller can remove them after the commit. AssetInUseError when any of
  // them is attached somewhere.
  deleteSubtree(id: bigint): Promise<StoredLocation[]>;
}

export const ASSET_REPOSITORY = Symbol("ASSET_REPOSITORY");
