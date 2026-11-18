// Rules from ideas/storage/index.md. The tree itself (parentId, fullSlug,
// closure) is kept consistent by the repository, in one transaction per change.

export type AssetKind = "file" | "directory" | "link";
export type AssetVisibility = "public" | "private";

export interface AssetNode {
  id: bigint;
  parentId: bigint | null;
  kind: AssetKind;
  visibility: AssetVisibility;
  slug: string;
  fullSlug: string;
  filename: string;
  createdById: bigint | null;
}

// Who is acting; null for the system (seeders, avatar handling)
export type Actor = {
  id: bigint;
  permissions: ReadonlySet<string>;
} | null;
