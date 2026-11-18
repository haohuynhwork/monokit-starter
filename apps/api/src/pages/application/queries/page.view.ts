import type { Block } from "../../domain/block-types.js";
import type { PageStatus } from "../../domain/page.js";
import type { LayoutFields, LayoutSettings } from "../../domain/page-layout.js";
import type { PageOptions } from "../../domain/page-settings.js";

// The panel's tree row
export interface PageSummary {
  id: string;
  parentId: string | null;
  layoutId: string | null;
  title: string;
  slug: string | null;
  // null: not reachable yet (no slug here or above)
  path: string | null;
  status: PageStatus;
  publishedAt: string | null;
  // Visible on the site now
  live: boolean;
  showInMenu: boolean;
  menuOrder: number;
  updatedAt: string;
}

// The panel's editor: `settings` as stored ({ version, layout, options...,
// blocks })
export interface PageView extends PageSummary {
  description: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
}

// What the site renders: layout and options resolved, no drafts
export interface PublicPageView {
  id: string;
  title: string;
  path: string;
  description: string | null;
  publishedAt: string;
  layout: LayoutFields;
  options: PageOptions;
  blocks: Block[];
}

export interface MenuItem {
  title: string;
  path: string;
  children: MenuItem[];
}

export interface PageLayoutView {
  id: string;
  name: string;
  isDefault: boolean;
  settings: LayoutSettings;
  // Non-deleted pages using it (pages without a layout count for the default)
  pageCount: number;
  updatedAt: string;
}

export const SUMMARY_FIELDS = [
  "id",
  "parentId",
  "layoutId",
  "title",
  "slug",
  "fullSlug",
  "status",
  "publishedAt",
  "showInMenu",
  "menuOrder",
  "updatedAt",
] as const;

export interface SummaryRow {
  id: bigint;
  parentId: bigint | null;
  layoutId: bigint | null;
  title: string;
  slug: string | null;
  fullSlug: string | null;
  status: PageStatus;
  publishedAt: string | null;
  showInMenu: boolean;
  menuOrder: number;
  updatedAt: string;
}

const str = (id: bigint | null) => (id === null ? null : String(id));

export function isLive(
  row: {
    status: PageStatus;
    publishedAt: string | null;
  },
  now = Date.now(),
): boolean {
  return (
    row.status !== "draft" &&
    row.publishedAt !== null &&
    Date.parse(row.publishedAt) <= now
  );
}

export function toSummary(row: SummaryRow): PageSummary {
  return {
    id: String(row.id),
    parentId: str(row.parentId),
    layoutId: str(row.layoutId),
    title: row.title,
    slug: row.slug,
    path: row.fullSlug,
    status: row.status,
    publishedAt: row.publishedAt,
    live: isLive(row),
    showInMenu: row.showInMenu,
    menuOrder: row.menuOrder,
    updatedAt: row.updatedAt,
  };
}
