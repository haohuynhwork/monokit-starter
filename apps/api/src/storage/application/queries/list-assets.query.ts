import { Query } from "@nestjs/cqrs";
import type { Actor } from "../../domain/asset.js";
import type { AssetView, Crumb } from "./asset.view.js";

export interface AssetListing {
  // null: the root
  folder: AssetView | null;
  // Root first, ending with the folder itself
  breadcrumbs: Crumb[];
  // Folders first, then in the requested order; one page
  items: AssetView[];
  // Matching items across all pages
  total: number;
}

export type AssetSort = "name" | "createdAt" | "size";

export interface ListAssetsOptions {
  // Search by name in the folder and everything below it (the whole
  // library at the root); without it, only the folder's own items
  q?: string;
  // 'image': only images (plus folders and links, to browse and pick)
  type?: "all" | "image";
  sort: AssetSort;
  order: "asc" | "desc";
  limit: number;
  offset: number;
}

export class ListAssetsQuery extends Query<AssetListing | null> {
  constructor(
    readonly folderId: bigint | null,
    readonly viewerId: bigint | null,
    readonly options: ListAssetsOptions,
    // null: the system, unchecked
    readonly actor: Actor = null,
  ) {
    super();
  }
}
