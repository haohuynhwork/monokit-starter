import type { AssetKind, AssetVisibility } from "../../domain/asset.js";
import type { Storage } from "../../domain/storage.js";
import type { UrlSigner } from "../../domain/url-signer.js";

// Response shape for one asset; bigint ids go out as strings
export interface AssetView {
  id: string;
  parentId: string | null;
  kind: AssetKind;
  visibility: AssetVisibility;
  name: string;
  slug: string;
  path: string;
  mimeType: string | null;
  sizeBytes: string | null;
  // To open it: public URL, a short-lived signed link, or the external link
  url: string | null;
  // Public, permanent, unique across backends: '<uuid>.<ext>' for files,
  // '<uuid>' for directories and links. Rich text references the asset as
  // 'serve/<key>'. Not the storage key, which only the backend uses.
  key: string;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Crumb {
  id: string;
  name: string;
}

export const ASSET_VIEW_FIELDS = [
  "id",
  "parentId",
  "kind",
  "visibility",
  "filename",
  "slug",
  "fullSlug",
  "mimeType",
  "sizeBytes",
  "storage",
  "storageKey",
  "key",
  "url",
  "createdById",
  "createdAt",
  "updatedAt",
] as const;

export interface AssetRow {
  id: bigint;
  parentId: bigint | null;
  kind: AssetKind;
  visibility: AssetVisibility;
  filename: string;
  slug: string;
  fullSlug: string;
  mimeType: string | null;
  sizeBytes: bigint | null;
  storage: string | null;
  storageKey: string | null;
  key: string;
  url: string | null;
  createdById: bigint | null;
  createdAt: string;
  updatedAt: string;
}

// `viewerId`: who the signed link for a private file is issued to
export async function assetUrl(
  row: Pick<
    AssetRow,
    "id" | "kind" | "visibility" | "storage" | "storageKey" | "url"
  >,
  storage: Storage,
  signer: UrlSigner,
  viewerId: bigint | null,
): Promise<string | null> {
  if (row.kind === "link") {
    return row.url;
  }
  if (row.kind !== "file" || !row.storageKey || row.storage !== storage.name) {
    return null;
  }
  if (row.visibility === "public") {
    return storage.url(row.storageKey);
  }
  return viewerId === null ? null : signer.sign(row.id, viewerId);
}

export async function toAssetView(
  row: AssetRow,
  storage: Storage,
  signer: UrlSigner,
  viewerId: bigint | null,
): Promise<AssetView> {
  return {
    id: String(row.id),
    parentId: row.parentId === null ? null : String(row.parentId),
    kind: row.kind,
    visibility: row.visibility,
    name: row.filename,
    slug: row.slug,
    path: row.fullSlug,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes === null ? null : String(row.sizeBytes),
    url: await assetUrl(row, storage, signer, viewerId),
    key: row.key,
    createdById: row.createdById === null ? null : String(row.createdById),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
