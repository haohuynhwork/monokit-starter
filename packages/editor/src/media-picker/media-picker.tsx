"use client";

import type { Asset, AssetListing } from "@packages/contracts";
import { Button } from "@packages/ui/components/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@packages/ui/components/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@packages/ui/components/dropdown-menu";
import { cn } from "@packages/ui/lib/utils";
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  Link2,
  List,
  Menu,
  MousePointerClick,
  Pencil,
  RotateCcw,
  RotateCw,
  Search,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { editorHost } from "../host";
import { typeLabel } from "./format";
import { NameInput } from "./inputs";
import { Item, ListHeader, TileThumb } from "./items";
import { type LinkError, LinkForm } from "./link-form";
import {
  DEFAULT_PREFS,
  LIST_SIZES,
  MAX_COLUMNS,
  MIN_COLUMNS,
  PAGE_SIZES,
  type PageSize,
  type Prefs,
  readPrefs,
  SORTS,
  type SortKey,
  savePrefs,
  type ViewMode,
} from "./prefs";
import { UploadPanel } from "./upload-panel";

export type PickKind = "image" | "file";

const IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];
const FILE_TYPES = [
  ...IMAGE_TYPES,
  "application/pdf",
];

export interface PickedFile {
  // The asset id, e.g. to attach it as a product's cover
  id: string;
  url: string;
  key: string;
  // What rich text stores: 'serve/<key>' (relative, so it resolves against
  // the site's base URL and survives a new base path or storage backend;
  // a link's goes to its current URL)
  src: string;
  name: string;
}

// Limits browsing to one folder and what's inside it, e.g. a post's own
// folder. Convenience, not access control: the library page shows all.
export interface PickerScope {
  folderId: string;
  // Replaces "Media" as the first breadcrumb, e.g. "This post"
  label: string;
}

// The picker: the media browser in a dialog, rendered in a portal above
// TinyMCE's own dialogs (z-index 1300), without a focus trap that would
// fight theirs. Only public files can be picked: content using them is
// public, and private links expire.
export function MediaPicker({
  kind,
  scope,
  scopeError,
  onPick,
  onPickMany,
  onClose,
}: {
  kind: PickKind;
  scope?: PickerScope;
  // The scope couldn't be loaded (e.g. the post's folder); shown instead of
  // silently browsing the whole library
  scopeError?: string;
  onPick: (file: PickedFile) => void;
  // Set to pick several (e.g. gallery images): clicks toggle, a button confirms
  onPickMany?: (files: PickedFile[]) => void;
  onClose: () => void;
}) {
  const title = onPickMany
    ? kind === "image"
      ? "Choose images"
      : "Choose files"
    : kind === "image"
      ? "Choose an image"
      : "Choose a file";
  return createPortal(
    // biome-ignore lint/a11y/noStaticElementInteractions: the backdrop; Escape also closes
    <div
      className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/50 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex h-full w-full flex-col overflow-hidden bg-popover text-foreground shadow-xl sm:h-[85vh] sm:max-h-[800px] sm:w-[90vw] sm:max-w-6xl sm:rounded-xl sm:border"
      >
        <MediaBrowser
          kind={kind}
          scope={scope}
          scopeError={scopeError}
          onPick={onPick}
          onPickMany={onPickMany}
          onClose={onClose}
        />
      </div>
    </div>,
    document.body,
  );
}

function toPicked(item: Asset, url: string): PickedFile {
  return {
    id: item.id,
    url,
    key: item.key,
    src: `serve/${item.key}`,
    name: item.name,
  };
}

// Extra actions on an item's context menu (e.g. move, visibility on the
// library page); `reload` refreshes the listing after a change
export type ItemMenu = (item: Asset, reload: () => void) => React.ReactNode;

// A file browser over the media library: folders, search (the folder and
// everything below it), sort, pages, grid or list, uploads, rename and
// delete. With `onPick` it picks public files (the picker); without it,
// it's the library itself and clicking a file opens it.
export function MediaBrowser({
  kind,
  scope,
  scopeError,
  onPick,
  onPickMany,
  onClose,
  initialFolderId,
  onFolderChange,
  itemMenu,
  canManage = () => true,
  actions,
  refreshKey = 0,
}: {
  kind: PickKind | "all";
  scope?: PickerScope;
  scopeError?: string;
  onPick?: (file: PickedFile) => void;
  // Picks several instead; see MediaPicker
  onPickMany?: (files: PickedFile[]) => void;
  onClose?: () => void;
  initialFolderId?: string | null;
  // Called when another folder opens, e.g. to keep it in the URL
  onFolderChange?: (id: string | null) => void;
  itemMenu?: ItemMenu;
  // Rename and delete; the api enforces it too
  canManage?: (item: Asset) => boolean;
  // More buttons in the footer, next to Upload
  actions?: React.ReactNode;
  // Bumped by the parent to reload the listing (e.g. after adding a link)
  refreshKey?: number;
}) {
  const root = scope?.folderId ?? null;
  const picking = !!onPick || !!onPickMany;
  // Opened by a click, so this runs in the browser only
  const [prefs, setPrefs] = useState<Prefs>(readPrefs);
  const [folderId, setFolderId] = useState<string | null>(
    initialFolderId ?? root,
  );
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [listing, setListing] = useState<AssetListing | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Success feedback (e.g. after uploading), shown apart from errors
  const [notice, setNotice] = useState<string | null>(null);
  // Just-uploaded items, outlined for a few seconds so they're easy to find
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  // The upload panel replaces the listing while open; holds files dropped
  // onto the listing before it opened
  const [uploadFiles, setUploadFiles] = useState<File[] | null>(null);
  // Bumped after a change (rename, new folder, delete) to reload the page
  const [reloadKey, setReloadKey] = useState(0);
  // Inline name input: an item being renamed, or a new folder
  const [editing, setEditing] = useState<{
    id: string | "new";
    value: string;
    // Shown under the name field; cleared by typing
    error?: string;
  } | null>(null);
  // Checked items on this page, for bulk delete; cleared when the page changes
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Files chosen so far when picking several, in click order; kept across
  // pages, folders and searches
  const [chosen, setChosen] = useState<Map<string, PickedFile>>(new Map());
  // The link form: a new link, or the link being edited
  const [linkForm, setLinkForm] = useState<Asset | "new" | null>(null);
  // What's typed in the page box; applied on Enter or leaving it
  const [pageInput, setPageInput] = useState("1");

  const updatePrefs = (change: Partial<Prefs>) => {
    const next = {
      ...prefs,
      ...change,
    };
    setPrefs(next);
    savePrefs(next);
  };

  // Typing settles for 300 ms before searching, from the first page
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    search,
  ]);

  const { sort, order } = SORTS[prefs.sort];
  const { pageSize } = prefs;
  useEffect(() => {
    if (scopeError) {
      return;
    }
    startTransition(async () => {
      const res = await editorHost().media.browseMedia({
        folderId,
        q: query,
        type: kind === "image" ? "image" : "all",
        sort,
        order,
        limit: pageSize,
        offset: page * pageSize,
      });
      setListing(res.listing ?? null);
      // Only report a load failure; feedback from the action that
      // triggered the reload (e.g. failed uploads) stays
      if (res.message) {
        setMessage(res.message);
      }
      setSelected(new Set());
      setPageInput(String(page + 1));
    });
  }, [
    folderId,
    query,
    kind,
    sort,
    order,
    page,
    pageSize,
    reloadKey,
    refreshKey,
    scopeError,
  ]);

  // Folders visited, for back and forward; `at` is the current one
  const [history, setHistory] = useState<{
    stack: (string | null)[];
    at: number;
  }>(() => ({
    stack: [
      initialFolderId ?? root,
    ],
    at: 0,
  }));

  // Goes to a folder; `fromHistory` (back/forward) keeps the history as is
  const openFolder = useCallback(
    (id: string | null, fromHistory = false) => {
      if (!fromHistory) {
        setHistory((h) =>
          h.stack[h.at] === (id ?? root)
            ? h
            : {
                stack: [
                  ...h.stack.slice(0, h.at + 1),
                  id ?? root,
                ],
                at: h.at + 1,
              },
        );
      }
      // Never above the scope
      setFolderId(id ?? root);
      onFolderChange?.(id ?? root);
      setMessage(null);
      setNotice(null);
      setSearch("");
      setQuery("");
      setPage(0);
    },
    [
      root,
      onFolderChange,
    ],
  );

  // Escape closes; capture so TinyMCE's dialog doesn't take it too
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") {
        return;
      }
      // While naming something, Escape only cancels that
      if (editing) {
        setEditing(null);
      } else if (linkForm !== null) {
        setLinkForm(null);
      } else if (uploadFiles !== null) {
        // Back from the upload panel to the folder
        setUploadFiles(null);
      } else if (onClose) {
        onClose();
      } else {
        // On the page, other dialogs (e.g. Move) handle their own Escape
        return;
      }
      e.stopPropagation();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [
    onClose,
    editing,
    linkForm,
    uploadFiles,
  ]);

  // One file into the current folder; the upload panel calls it per file
  const uploadOne = (file: File) => {
    const form = new FormData();
    form.set("file", file, file.name);
    form.set("folderId", folderId ?? "");
    return editorHost().media.uploadToFolder(form);
  };

  // Back from the upload panel: the picker stays open, the new files are
  // outlined in the reloaded listing and the user picks one themselves
  function finishUpload(added: Asset[]) {
    setUploadFiles(null);
    if (added.length === 0) {
      return;
    }
    setMessage(null);
    setNotice(
      `Uploaded ${added.length === 1 ? `“${added[0]!.name}”` : `${added.length} files`}.`,
    );
    setHighlighted(new Set(added.map((a) => a.id)));
    // Searching would hide them; show the folder they went into
    setSearch("");
    setQuery("");
    setReloadKey((k) => k + 1);
  }

  // The outline fades after a few seconds
  useEffect(() => {
    if (highlighted.size === 0) {
      return;
    }
    const timer = setTimeout(() => setHighlighted(new Set()), 4000);
    return () => clearTimeout(timer);
  }, [
    highlighted,
  ]);

  function commitEdit() {
    const current = editing;
    const name = current?.value.trim();
    if (!current || !name) {
      setEditing(null);
      return;
    }
    if (name.length > 255) {
      setEditing({
        ...current,
        error: "Use at most 255 characters.",
      });
      return;
    }
    startTransition(async () => {
      const res =
        current.id === "new"
          ? await editorHost().media.createFolderIn(folderId, name)
          : await editorHost().media.renameItem(current.id, name);
      if (res.ok) {
        setEditing(null);
        setMessage(null);
        setReloadKey((k) => k + 1);
      } else if (res.field === "name") {
        setEditing({
          ...current,
          error: res.message ?? "Could not save the name.",
        });
      } else {
        setMessage(res.message ?? "Could not save the name.");
      }
    });
  }

  // Resolves to an error (with its field, if any), or null once saved
  async function saveLink(
    name: string,
    url: string,
  ): Promise<LinkError | null> {
    const res =
      linkForm === "new"
        ? await editorHost().media.createLinkIn(folderId, name, url)
        : linkForm
          ? await editorHost().media.updateLink(linkForm.id, name, url)
          : {
              ok: true,
            };
    if (!res.ok) {
      return {
        message: res.message ?? "Could not save the link.",
        field: "field" in res ? res.field : undefined,
      };
    }
    setNotice(linkForm === "new" ? `Added “${name}”.` : `Saved “${name}”.`);
    setMessage(null);
    setLinkForm(null);
    setReloadKey((k) => k + 1);
    return null;
  }

  function remove(item: Asset) {
    const what =
      item.kind === "directory"
        ? "the folder and everything in it"
        : `“${item.name}”`;
    if (!confirm(`Delete ${what}? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      const res = await editorHost().media.deleteItem(item.id);
      setMessage(res.ok ? null : (res.message ?? "Could not delete."));
      if (res.ok) {
        setReloadKey((k) => k + 1);
      }
    });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // One by one, so items that can't go (in use, someone else's) are
  // reported while the rest are still deleted
  function removeSelected() {
    const chosen = items.filter((i) => selected.has(i.id));
    const folders = chosen.filter((i) => i.kind === "directory").length;
    const note = folders
      ? ` (${folders} folder${folders > 1 ? "s" : ""}, with everything in them)`
      : "";
    if (
      !confirm(
        `Delete ${chosen.length} item${chosen.length > 1 ? "s" : ""}${note}? This cannot be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const failed: string[] = [];
      for (const item of chosen) {
        const res = await editorHost().media.deleteItem(item.id);
        if (!res.ok) {
          failed.push(`${item.name}: ${res.message ?? "could not delete"}`);
        }
      }
      const done = chosen.length - failed.length;
      setMessage(
        failed.length
          ? `Deleted ${done}; ${failed.length} not deleted. ${failed.join("; ")}`
          : null,
      );
      setReloadKey((k) => k + 1);
    });
  }

  function goToPage(value: string) {
    const n = Number.parseInt(value, 10);
    if (Number.isNaN(n)) {
      setPageInput(String(page + 1));
      return;
    }
    const next = Math.min(pages, Math.max(1, n)) - 1;
    setPageInput(String(next + 1));
    setPage(next);
  }

  const pickItem = (item: Asset) => {
    if (!item.url) {
      return;
    }
    if (onPickMany) {
      const url = item.url;
      setChosen((prev) => {
        const next = new Map(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.set(item.id, toPicked(item, url));
        }
        return next;
      });
    } else if (onPick) {
      onPick(toPicked(item, item.url));
    } else {
      window.open(item.url, "_blank", "noopener");
    }
  };
  const canPick = (item: Asset) =>
    !!item.url && (!picking || item.visibility === "public");
  const reload = () => setReloadKey((k) => k + 1);
  // Zoom acts on the current view: grid items per row, list row size
  const grid = prefs.view === "grid";
  const zoom = {
    canIn: grid
      ? prefs.columns > MIN_COLUMNS
      : prefs.listSize < LIST_SIZES.length - 1,
    canOut: grid ? prefs.columns < MAX_COLUMNS : prefs.listSize > 0,
    isDefault: grid
      ? prefs.columns === DEFAULT_PREFS.columns
      : prefs.listSize === DEFAULT_PREFS.listSize,
    by: (step: 1 | -1) =>
      updatePrefs(
        grid
          ? {
              columns: prefs.columns - step,
            }
          : {
              listSize: prefs.listSize + step,
            },
      ),
    reset: () =>
      updatePrefs(
        grid
          ? {
              columns: DEFAULT_PREFS.columns,
            }
          : {
              listSize: DEFAULT_PREFS.listSize,
            },
      ),
  };
  const sortBy = (sort: SortKey) => {
    updatePrefs({
      sort,
    });
    setPage(0);
  };
  const stepHistory = (by: -1 | 1) => {
    const at = history.at + by;
    if (at < 0 || at >= history.stack.length) {
      return;
    }
    setHistory({
      ...history,
      at,
    });
    openFolder(history.stack[at] ?? null, true);
  };
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      editorHost().notify(`Copied ${what}`, {
        kind: "success",
      });
    } catch {
      editorHost().notify(`Couldn't copy the ${what}`, {
        kind: "error",
      });
    }
  };

  const items = listing?.items ?? [];
  const total = listing?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const allOnPage = items.length > 0 && items.every((i) => selected.has(i.id));
  const toggleAll = () =>
    setSelected(allOnPage ? new Set() : new Set(items.map((i) => i.id)));
  const searching = query.trim() !== "";
  // Scoped: start at the scope folder, labelled e.g. "This post"
  const trail = listing?.breadcrumbs ?? [];
  const scopeAt = root ? trail.findIndex((c) => c.id === root) : -1;
  const crumbs: {
    id: string | null;
    name: string;
  }[] = scope
    ? [
        {
          id: root,
          name: scope.label,
        },
        ...(scopeAt >= 0 ? trail.slice(scopeAt + 1) : []),
      ]
    : [
        {
          id: null,
          name: "Media",
        },
        ...trail,
      ];
  return (
    <>
      <div className="flex items-center gap-2 border-b p-2">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back"
            title="Back"
            disabled={history.at === 0}
            onClick={() => stepHistory(-1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Forward"
            title="Forward"
            disabled={history.at >= history.stack.length - 1}
            onClick={() => stepHistory(1)}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Reload"
            title="Reload"
            onClick={reload}
          >
            <RotateCw />
          </Button>
        </div>
        <nav
          aria-label="Folder"
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm whitespace-nowrap [contain:inline-size]"
        >
          {crumbs.map((c, i) => (
            <span key={c.id ?? "root"} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight className="size-3.5 text-muted-foreground" />
              )}
              <button
                type="button"
                className="rounded px-1 text-muted-foreground hover:text-foreground disabled:font-medium disabled:text-foreground"
                disabled={i === crumbs.length - 1 && !searching}
                onClick={() => openFolder(c.id)}
              >
                {c.name}
              </button>
            </span>
          ))}
        </nav>
        {onClose && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            aria-label="Close"
            onClick={onClose}
          >
            <X />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 border-b p-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              folderId !== root
                ? "Search in this folder"
                : scope
                  ? `Search ${scope.label.toLowerCase()}`
                  : "Search all media"
            }
            className="h-8 w-full rounded-lg border border-input bg-transparent pr-2 pl-8 text-sm"
          />
        </label>
        {/* Split button: the icon shows the current view and toggles it; the
            arrow lists the views */}
        <div className="flex rounded-lg border">
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-r-none"
            aria-label={
              prefs.view === "grid"
                ? "Grid view (switch to list)"
                : "List view (switch to grid)"
            }
            title={prefs.view === "grid" ? "Grid view" : "List view"}
            onClick={() =>
              updatePrefs({
                view: prefs.view === "grid" ? "list" : "grid",
              })
            }
          >
            {prefs.view === "grid" ? <LayoutGrid /> : <List />}
          </Button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="w-5 rounded-l-none border-l"
                aria-label="Choose view"
              >
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[1500] w-36">
              <DropdownMenuRadioGroup
                value={prefs.view}
                onValueChange={(view) =>
                  updatePrefs({
                    view: view as ViewMode,
                  })
                }
              >
                <DropdownMenuRadioItem value="grid">
                  <LayoutGrid /> Grid
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="list">
                  <List /> List
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* The same actions as right-clicking empty space, plus sorting */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="Menu">
              <Menu />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[1500] w-44">
            <DropdownMenuItem
              disabled={!!scopeError || searching}
              onSelect={() =>
                setEditing({
                  id: "new",
                  value: "",
                })
              }
            >
              <FolderPlus /> New folder
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!!scopeError}
              onSelect={() => setUploadFiles([])}
            >
              <Upload /> Upload here
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!!scopeError}
              onSelect={() => setLinkForm("new")}
            >
              <Link2 /> Add link
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Grid: zooming in fits fewer items per row. List: bigger rows */}
            <div className="flex h-8 items-center gap-1 px-1.5 text-sm">
              <span className="flex-1">Zoom</span>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Zoom out"
                title="Zoom out"
                disabled={!zoom.canOut}
                onClick={() => zoom.by(-1)}
              >
                <ZoomOut />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Reset zoom"
                title="Reset zoom"
                disabled={zoom.isDefault}
                onClick={zoom.reset}
              >
                <RotateCcw />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Zoom in"
                title="Zoom in"
                disabled={!zoom.canIn}
                onClick={() => zoom.by(1)}
              >
                <ZoomIn />
              </Button>
            </div>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowDownUp /> Sort
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="z-[1500] w-40">
                <DropdownMenuRadioGroup
                  value={prefs.sort}
                  onValueChange={(v) => sortBy(v as SortKey)}
                >
                  {Object.entries(SORTS).map(([key, s]) => (
                    <DropdownMenuRadioItem key={key} value={key}>
                      {s.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                updatePrefs(DEFAULT_PREFS);
                setPage(0);
              }}
            >
              <RotateCcw /> Restore defaults
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <Button variant="ghost" size="xs" onClick={toggleAll}>
            {allOnPage ? "Unselect all" : "Select all on page"}
          </Button>
          <Button
            variant="destructive"
            size="xs"
            className="ml-auto"
            disabled={pending}
            onClick={removeSelected}
          >
            <Trash2 /> Delete
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {uploadFiles !== null ? (
        <UploadPanel
          folderLabel={crumbs.at(-1)?.name ?? "Media"}
          accept={kind === "image" ? IMAGE_TYPES : FILE_TYPES}
          initialFiles={uploadFiles}
          upload={uploadOne}
          onClose={finishUpload}
        />
      ) : (
        /* Right-click on empty space: new folder, upload */
        <ContextMenu modal={false}>
          <ContextMenuTrigger asChild>
            <div
              className="flex min-h-0 flex-1 flex-col overflow-auto p-2 [contain:inline-size]"
              // Dropping files onto the listing opens the upload panel with them
              onDragOver={(e) => {
                if (!scopeError && e.dataTransfer.types.includes("Files")) {
                  e.preventDefault();
                }
              }}
              onDrop={(e) => {
                if (scopeError || e.dataTransfer.files.length === 0) {
                  return;
                }
                e.preventDefault();
                setUploadFiles([
                  ...e.dataTransfer.files,
                ]);
              }}
            >
              {message && (
                <p className="mb-3 text-sm text-destructive">{message}</p>
              )}
              {notice && (
                <p role="status" className="mb-3 text-sm text-muted-foreground">
                  {notice}
                  {highlighted.size > 0 &&
                    !items.some((i) => highlighted.has(i.id)) &&
                    " Not on this page with the current sort; try “Newest”."}
                </p>
              )}
              {scopeError ? (
                <p className="rounded-lg border border-destructive/40 p-8 text-center text-sm text-destructive">
                  {scopeError}
                </p>
              ) : pending && !listing ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : items.length === 0 &&
                editing?.id !== "new" &&
                prefs.view === "list" ? (
                // The list keeps its column headers when empty
                <ul className="flex min-w-[40rem] flex-1 flex-col divide-y rounded-lg border">
                  <ListHeader
                    checked={false}
                    onToggleAll={toggleAll}
                    sort={prefs.sort}
                    onSort={sortBy}
                    size={prefs.listSize}
                  />
                  <li className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
                    {searching
                      ? "No matches."
                      : "Nothing here yet. Upload a file, or right-click for a new folder."}
                  </li>
                </ul>
              ) : items.length === 0 && editing?.id !== "new" ? (
                <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  {searching
                    ? "No matches."
                    : "Nothing here yet. Upload a file, or right-click for a new folder."}
                </p>
              ) : (
                <ul
                  style={
                    {
                      "--cols": prefs.columns,
                    } as React.CSSProperties
                  }
                  className={cn(
                    prefs.view === "grid"
                      ? "grid grid-cols-[repeat(min(var(--cols),3),minmax(0,1fr))] gap-3 sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
                      : "flex min-w-[40rem] flex-col divide-y rounded-lg border",
                    pending && "opacity-60",
                  )}
                >
                  {prefs.view === "list" && (
                    <ListHeader
                      checked={allOnPage}
                      onToggleAll={toggleAll}
                      sort={prefs.sort}
                      onSort={sortBy}
                      size={prefs.listSize}
                    />
                  )}
                  {editing?.id === "new" && (
                    <li>
                      <NameInput
                        view={prefs.view}
                        listSize={prefs.listSize}
                        checkboxSpace
                        value={editing.value}
                        error={editing.error}
                        onChange={(value) =>
                          setEditing({
                            id: "new",
                            value,
                          })
                        }
                        onCommit={commitEdit}
                        onCancel={() => setEditing(null)}
                      />
                    </li>
                  )}
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className={cn(
                        "group/item relative",
                        prefs.view === "list" && "flex items-center",
                        // On the whole line, so it's behind the checkbox too
                        prefs.view === "list" &&
                          (chosen.has(item.id)
                            ? "bg-primary/10 hover:bg-primary/15"
                            : "hover:bg-muted"),
                        highlighted.has(item.id) &&
                          "rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background",
                      )}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Select ${item.name}`}
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                        className={cn(
                          "size-4 shrink-0 accent-primary",
                          prefs.view === "grid"
                            ? cn(
                                "absolute top-2 left-2 z-10 transition-opacity",
                                // Shown on hover, or all once anything is selected
                                selected.size === 0 &&
                                  "opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100",
                              )
                            : "ml-3",
                        )}
                      />
                      {editing?.id === item.id ? (
                        <NameInput
                          view={prefs.view}
                          value={editing.value}
                          error={editing.error}
                          preview={
                            <TileThumb
                              item={item}
                              iconClassName={
                                prefs.view === "list" ? "size-5" : undefined
                              }
                            />
                          }
                          listSize={prefs.listSize}
                          detail={
                            item.kind === "directory"
                              ? "Folder"
                              : typeLabel(item)
                          }
                          onChange={(value) =>
                            setEditing({
                              id: item.id,
                              value,
                            })
                          }
                          onCommit={commitEdit}
                          onCancel={() => setEditing(null)}
                        />
                      ) : (
                        <ContextMenu modal={false}>
                          <ContextMenuTrigger asChild>
                            <div className="h-full min-w-0 flex-1">
                              <Item
                                view={prefs.view}
                                listSize={prefs.listSize}
                                item={item}
                                // Results come from anywhere below; show where
                                showPath={searching}
                                requirePublic={picking}
                                chosen={chosen.has(item.id)}
                                onOpen={() => openFolder(item.id)}
                                onPick={() => pickItem(item)}
                              />
                            </div>
                          </ContextMenuTrigger>
                          {/* Above the picker (z-1400) */}
                          <ContextMenuContent className="z-[1500] w-44">
                            {item.kind === "directory" ? (
                              <ContextMenuItem
                                onSelect={() => openFolder(item.id)}
                              >
                                <FolderOpen /> Open
                              </ContextMenuItem>
                            ) : (
                              <ContextMenuItem
                                disabled={!canPick(item)}
                                onSelect={() => pickItem(item)}
                              >
                                {onPickMany ? (
                                  chosen.has(item.id) ? (
                                    <>
                                      <X /> Unchoose
                                    </>
                                  ) : (
                                    <>
                                      <MousePointerClick /> Choose
                                    </>
                                  )
                                ) : picking ? (
                                  <>
                                    <MousePointerClick /> Choose
                                  </>
                                ) : (
                                  <>
                                    <ExternalLink /> Open
                                  </>
                                )}
                              </ContextMenuItem>
                            )}
                            {item.kind !== "directory" && (
                              <ContextMenuItem
                                disabled={!item.url}
                                onSelect={() =>
                                  item.url && copy(item.url, "URL")
                                }
                              >
                                <Copy /> Copy URL
                              </ContextMenuItem>
                            )}
                            <ContextMenuItem
                              onSelect={() => copy(item.key, "key")}
                            >
                              <Copy /> Copy key
                            </ContextMenuItem>
                            {item.kind === "link" && (
                              <ContextMenuItem
                                disabled={!canManage(item)}
                                onSelect={() => setLinkForm(item)}
                              >
                                <Link2 /> Edit link
                              </ContextMenuItem>
                            )}
                            {itemMenu?.(item, reload)}
                            <ContextMenuItem
                              disabled={!canManage(item)}
                              onSelect={() =>
                                setEditing({
                                  id: item.id,
                                  value: item.name,
                                })
                              }
                            >
                              <Pencil /> Rename
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            {/* On one of several selected items, Delete takes the
                                whole selection, like the bar's button */}
                            {selected.size > 1 && selected.has(item.id) ? (
                              <ContextMenuItem
                                variant="destructive"
                                disabled={pending}
                                onSelect={removeSelected}
                              >
                                <Trash2 /> Delete {selected.size} items
                              </ContextMenuItem>
                            ) : (
                              <ContextMenuItem
                                variant="destructive"
                                disabled={!canManage(item)}
                                onSelect={() => remove(item)}
                              >
                                <Trash2 /> Delete
                              </ContextMenuItem>
                            )}
                          </ContextMenuContent>
                        </ContextMenu>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="z-[1500] w-44">
            <ContextMenuItem
              disabled={!!scopeError || searching}
              onSelect={() =>
                setEditing({
                  id: "new",
                  value: "",
                })
              }
            >
              <FolderPlus /> New folder
            </ContextMenuItem>
            <ContextMenuItem
              disabled={!!scopeError}
              onSelect={() => setUploadFiles([])}
            >
              <Upload /> Upload here
            </ContextMenuItem>
            <ContextMenuItem
              disabled={!!scopeError}
              onSelect={() => setLinkForm("new")}
            >
              <Link2 /> Add link
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t p-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !!scopeError || uploadFiles !== null}
          onClick={() => setUploadFiles([])}
          title="Uploads are public; make a file private from its menu"
        >
          <Upload /> Upload
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={
            pending || !!scopeError || searching || uploadFiles !== null
          }
          onClick={() =>
            setEditing({
              id: "new",
              value: "",
            })
          }
        >
          <FolderPlus /> New folder
        </Button>
        {actions}
        {onPickMany && (
          <>
            {chosen.size > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setChosen(new Map())}
              >
                Clear
              </Button>
            )}
            <Button
              size="sm"
              disabled={chosen.size === 0}
              onClick={() =>
                onPickMany([
                  ...chosen.values(),
                ])
              }
            >
              <Check /> Choose{chosen.size > 0 && ` ${chosen.size}`}
            </Button>
          </>
        )}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 text-sm text-muted-foreground">
          <label className="flex items-center gap-1.5">
            <span className="hidden sm:inline">Per page</span>
            <select
              aria-label="Items per page"
              value={pageSize}
              onChange={(e) => {
                updatePrefs({
                  pageSize: Number(e.target.value) as PageSize,
                });
                setPage(0);
              }}
              className="h-8 rounded-lg border border-input bg-transparent px-1.5 text-sm text-foreground"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <span className="hidden sm:inline">
            {total === 0
              ? "0 items"
              : `${page * pageSize + 1}–${Math.min(total, (page + 1) * pageSize)} of ${total}`}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={pending || page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft />
          </Button>
          <label className="flex items-center gap-1">
            <span className="sr-only">Page</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={pages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={(e) => goToPage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  goToPage(e.currentTarget.value);
                }
              }}
              className="h-8 w-14 rounded-lg border border-input bg-transparent px-1.5 text-center text-sm text-foreground tabular-nums"
            />
            <span aria-live="polite">/ {pages}</span>
          </label>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={pending || page + 1 >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      {linkForm !== null && (
        <LinkForm
          link={linkForm === "new" ? null : linkForm}
          folderLabel={crumbs.at(-1)?.name ?? "Media"}
          onSave={saveLink}
          onCancel={() => setLinkForm(null)}
        />
      )}
    </>
  );
}
