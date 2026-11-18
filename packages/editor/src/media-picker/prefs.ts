import { type BrowseOptions, editorHost } from "../host";

export type ViewMode = "grid" | "list";
// Grid items per row (the slider's range); small screens show at most 3
type Columns = number;
export const MIN_COLUMNS = 2;
export const MAX_COLUMNS = 10;

// Items per page; 24 and its multiples fill whole rows at 4, 6 and 8
export const PAGE_SIZES = [
  12,
  24,
  48,
  96,
] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export const SORTS = {
  "name-asc": {
    label: "Name A–Z",
    sort: "name",
    order: "asc",
  },
  "name-desc": {
    label: "Name Z–A",
    sort: "name",
    order: "desc",
  },
  "createdAt-desc": {
    label: "Newest",
    sort: "createdAt",
    order: "desc",
  },
  "createdAt-asc": {
    label: "Oldest",
    sort: "createdAt",
    order: "asc",
  },
  "size-desc": {
    label: "Largest",
    sort: "size",
    order: "desc",
  },
  "size-asc": {
    label: "Smallest",
    sort: "size",
    order: "asc",
  },
} as const satisfies Record<
  string,
  {
    label: string;
    sort: BrowseOptions["sort"];
    order: BrowseOptions["order"];
  }
>;
export type SortKey = keyof typeof SORTS;

// List row sizes, smallest first: the thumbnail and the row's padding
export const LIST_SIZES = [
  {
    thumb: "size-7",
    row: "py-1",
  },
  {
    thumb: "size-9",
    row: "py-2",
  },
  {
    thumb: "size-14",
    row: "py-2",
  },
] as const;

export interface Prefs {
  view: ViewMode;
  columns: Columns;
  // Index into LIST_SIZES
  listSize: number;
  sort: SortKey;
  pageSize: PageSize;
}

const prefsKey = () => editorHost().storageKey("media-picker:prefs");
export const DEFAULT_PREFS: Prefs = {
  view: "grid",
  columns: 6,
  listSize: 1,
  sort: "name-asc",
  pageSize: 24,
};

// Remembered between openings; storage may be unavailable (private mode)
export function readPrefs(): Prefs {
  try {
    const saved = JSON.parse(
      localStorage.getItem(prefsKey()) ?? "{}",
    ) as Partial<Prefs>;
    return {
      view: saved.view === "list" ? "list" : "grid",
      columns:
        typeof saved.columns === "number"
          ? Math.min(
              MAX_COLUMNS,
              Math.max(MIN_COLUMNS, Math.round(saved.columns)),
            )
          : DEFAULT_PREFS.columns,
      listSize:
        typeof saved.listSize === "number" &&
        saved.listSize >= 0 &&
        saved.listSize < LIST_SIZES.length
          ? Math.round(saved.listSize)
          : DEFAULT_PREFS.listSize,
      sort: saved.sort && saved.sort in SORTS ? saved.sort : DEFAULT_PREFS.sort,
      pageSize: PAGE_SIZES.includes(saved.pageSize as PageSize)
        ? (saved.pageSize as PageSize)
        : DEFAULT_PREFS.pageSize,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(prefsKey(), JSON.stringify(prefs));
  } catch {
    // Not remembered; fine
  }
}
