"use client";

import type { Asset } from "@packages/contracts";
import { cn } from "@packages/ui/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  Check,
  FileImage,
  FileText,
  Folder,
  Link2,
  Lock,
} from "lucide-react";
import { details, formatDate, formatSize, typeLabel } from "./format";
import { LIST_SIZES, SORTS, type SortKey, type ViewMode } from "./prefs";

// One entry in the current view
export function Item({
  view,
  showPath,
  listSize,
  ...props
}: {
  view: ViewMode;
  showPath: boolean;
  // Index into LIST_SIZES (list view)
  listSize: number;
  item: Asset;
  requirePublic: boolean;
  chosen?: boolean;
  onOpen: () => void;
  onPick: () => void;
}) {
  return view === "grid" ? (
    <Tile {...props} showPath={showPath} />
  ) : (
    <Row {...props} showPath={showPath} size={listSize} />
  );
}

// Where a search result lives: its path without its own name
function folderOf(item: Asset): string {
  const i = item.path.lastIndexOf(`/${item.slug}`);
  return i > 0 ? item.path.slice(0, i) : "Media";
}

// A tile's square: the image itself, or the kind's icon
export function TileThumb({
  item,
  iconClassName = "size-1/3",
}: {
  item: Asset;
  // The icon's size: a third of a tile, or fixed in a list row
  iconClassName?: string;
}) {
  const folder = item.kind === "directory";
  if (!folder && isImage(item) && item.url) {
    return (
      // biome-ignore lint/performance/noImgElement: thumbnails from /serve
      <img
        src={item.url}
        alt=""
        className="size-full object-cover"
        loading="lazy"
      />
    );
  }
  const Icon = folder
    ? Folder
    : item.kind === "link"
      ? Link2
      : isImage(item)
        ? FileImage
        : FileText;
  return <Icon className={cn(iconClassName, "text-muted-foreground")} />;
}

// Every kind has the same shape (square preview, one name line, one detail
// line), so a row of tiles lines up
function Tile({
  item,
  showPath,
  requirePublic,
  chosen = false,
  onOpen,
  onPick,
}: {
  item: Asset;
  showPath: boolean;
  requirePublic: boolean;
  chosen?: boolean;
  onOpen: () => void;
  onPick: () => void;
}) {
  const folder = item.kind === "directory";
  // Picking takes public files only; the library opens any file
  const usable =
    folder || (!!item.url && (!requirePublic || item.visibility === "public"));
  const detail = showPath
    ? folderOf(item)
    : folder
      ? "Folder"
      : [
          typeLabel(item),
          formatSize(item.sizeBytes),
        ]
          .filter(Boolean)
          .join(" · ");
  return (
    <button
      type="button"
      disabled={!usable}
      onClick={folder ? onOpen : onPick}
      aria-pressed={folder ? undefined : chosen}
      title={usable ? details(item) : "Private files can't be used in posts"}
      className={cn(
        "flex h-full w-full flex-col gap-1.5 rounded-lg border p-2 text-left text-sm hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50",
        chosen && "border-primary ring-2 ring-primary",
      )}
    >
      <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-muted">
        <TileThumb item={item} />
        {item.visibility === "private" && !folder && (
          <Lock className="absolute top-1.5 right-1.5 size-4 text-muted-foreground" />
        )}
        {chosen && (
          <Check className="absolute right-1.5 bottom-1.5 size-5 rounded-full bg-primary p-0.5 text-primary-foreground" />
        )}
      </span>
      <span className={cn("truncate", folder && "font-medium")}>
        {item.name}
      </span>
      <span className="truncate text-xs text-muted-foreground">
        {detail || " "}
      </span>
    </button>
  );
}

const isImage = (item: Asset) =>
  item.mimeType?.startsWith("image/") === true ||
  (item.kind === "link" &&
    /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(item.url ?? ""));

// Column titles for the list view; widths match Row
// A column title that sorts by its field: a first click picks the field's
// usual order (names A–Z, dates and sizes largest first), the next flips it
function SortTitle({
  field,
  label,
  sort,
  onSort,
  className,
}: {
  field: "name" | "createdAt" | "size";
  label: string;
  sort: SortKey;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const current = SORTS[sort];
  const active = current.sort === field;
  const next: SortKey = active
    ? `${field}-${current.order === "asc" ? "desc" : "asc"}`
    : field === "name"
      ? "name-asc"
      : `${field}-desc`;
  const Arrow = current.order === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(next)}
      aria-label={`Sort: ${SORTS[next].label}`}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded hover:text-foreground",
        active && "text-foreground",
        className,
      )}
    >
      {label}
      {active && <Arrow className="size-3" />}
    </button>
  );
}

export function ListHeader({
  checked,
  onToggleAll,
  sort,
  onSort,
  size,
}: {
  checked: boolean;
  onToggleAll: () => void;
  // Index into LIST_SIZES, so the thumbnail column lines up
  size: number;
  sort: SortKey;
  onSort: (key: SortKey) => void;
}) {
  return (
    <li className="flex items-center gap-3 bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
      <input
        type="checkbox"
        aria-label="Select all on this page"
        checked={checked}
        onChange={onToggleAll}
        className="size-4 shrink-0 accent-primary"
      />
      <span className={cn("shrink-0", LIST_SIZES[size]?.thumb, "h-auto")} />
      <SortTitle
        field="name"
        label="Name"
        sort={sort}
        onSort={onSort}
        className="flex-1"
      />
      <span className="w-14 shrink-0">Type</span>
      <SortTitle
        field="size"
        label="Size"
        sort={sort}
        onSort={onSort}
        className="w-16 justify-end"
      />
      <SortTitle
        field="createdAt"
        label="Added"
        sort={sort}
        onSort={onSort}
        className="w-24 justify-end"
      />
      <span className="w-24 shrink-0 text-right">Modified</span>
      <span className="w-16 shrink-0 text-right">Access</span>
    </li>
  );
}

// List view: thumbnail, name, type, size, dates and visibility on one line
function Row({
  item,
  showPath,
  size,
  requirePublic,
  chosen = false,
  onOpen,
  onPick,
}: {
  item: Asset;
  showPath: boolean;
  size: number;
  requirePublic: boolean;
  chosen?: boolean;
  onOpen: () => void;
  onPick: () => void;
}) {
  const folder = item.kind === "directory";
  // Picking takes public files only; the library opens any file
  const usable =
    folder || (!!item.url && (!requirePublic || item.visibility === "public"));
  const Icon = folder
    ? Folder
    : item.kind === "link"
      ? Link2
      : isImage(item)
        ? FileImage
        : FileText;
  return (
    <button
      type="button"
      disabled={!usable}
      onClick={folder ? onOpen : onPick}
      aria-pressed={folder ? undefined : chosen}
      title={usable ? details(item) : "Private files can't be used in posts"}
      className={cn(
        "flex w-full items-center gap-3 px-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50",
        LIST_SIZES[size]?.row,
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded bg-muted",
          LIST_SIZES[size]?.thumb,
        )}
      >
        {!folder && isImage(item) && item.url ? (
          // biome-ignore lint/performance/noImgElement: thumbnails from /serve
          <img
            src={item.url}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <Icon className="size-5 text-muted-foreground" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate", folder && "font-medium")}>
          {item.name}
        </span>
        {showPath && (
          <span className="truncate text-xs text-muted-foreground">
            {folderOf(item)}
          </span>
        )}
      </span>
      <span className="w-14 shrink-0 text-xs text-muted-foreground">
        {typeLabel(item)}
      </span>
      <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
        {formatSize(item.sizeBytes)}
      </span>
      <time
        dateTime={item.createdAt}
        className="w-24 shrink-0 text-right text-xs text-muted-foreground"
      >
        {formatDate(item.createdAt)}
      </time>
      <time
        dateTime={item.updatedAt}
        className="w-24 shrink-0 text-right text-xs text-muted-foreground"
      >
        {formatDate(item.updatedAt)}
      </time>
      <span className="flex w-16 shrink-0 items-center justify-end gap-1 text-xs text-muted-foreground">
        {folder ? null : item.visibility === "private" ? (
          <>
            <Lock className="size-3.5" /> Private
          </>
        ) : (
          "Public"
        )}
      </span>
    </button>
  );
}
