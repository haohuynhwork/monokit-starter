import { checkNotReserved } from "../../common/domain/paths.js";
import { type Block, blockAssetKeys, sanitizeBlocks } from "./block-types.js";
import {
  InvalidPageError,
  LivePageNeedsSlugError,
  MovePageIntoItselfError,
  PageHasChildrenError,
  PageNotReachableError,
  PrivateFilesInPageError,
} from "./page.errors.js";
import {
  checkPageSettings,
  emptySettings,
  type PageSettings,
  settingsFileKeys,
} from "./page-settings.js";

// Rules from ideas/pages/index.md. The tree (parentId, fullSlug, closure) is
// kept consistent by the repository, like posts. Only editors and admins
// reach these commands (pages are site structure).

export type PageStatus = "draft" | "scheduled" | "published";

export interface PageProps {
  id: bigint | null;
  parentId: bigint | null;
  authorId: bigint | null;
  layoutId: bigint | null;
  title: string;
  slug: string | null;
  description: string | null;
  settings: PageSettings;
  status: PageStatus;
  publishedAt: string | null;
  showInMenu: boolean;
  menuOrder: number;
  deletedAt: string | null;
}

export class Page {
  private constructor(private props: PageProps) {}

  static draft(input: {
    title: string;
    authorId: bigint;
    parentId: bigint | null;
    layoutId: bigint | null;
  }): Page {
    return new Page({
      id: null,
      parentId: input.parentId,
      authorId: input.authorId,
      layoutId: input.layoutId,
      title: checkTitle(input.title),
      slug: null,
      description: null,
      settings: emptySettings(),
      status: "draft",
      publishedAt: null,
      showInMenu: false,
      menuOrder: 0,
      deletedAt: null,
    });
  }

  static restore(props: PageProps): Page {
    return new Page(props);
  }

  get id(): bigint | null {
    return this.props.id;
  }
  get parentId(): bigint | null {
    return this.props.parentId;
  }
  get slug(): string | null {
    return this.props.slug;
  }
  get settings(): PageSettings {
    return this.props.settings;
  }
  get isLive(): boolean {
    return this.props.status !== "draft";
  }

  snapshot(): Readonly<PageProps> {
    return this.props;
  }

  assignId(id: bigint): void {
    this.props.id = id;
  }

  edit(changes: {
    title?: string;
    description?: string | null;
    layoutId?: bigint | null;
    showInMenu?: boolean;
    menuOrder?: number;
  }): void {
    if (changes.title !== undefined) {
      this.props.title = checkTitle(changes.title);
    }
    if (changes.description !== undefined) {
      this.props.description = checkDescription(changes.description);
    }
    if (changes.layoutId !== undefined) {
      this.props.layoutId = changes.layoutId;
    }
    if (changes.showInMenu !== undefined) {
      this.props.showInMenu = changes.showInMenu;
    }
    if (changes.menuOrder !== undefined) {
      if (
        !Number.isInteger(changes.menuOrder) ||
        Math.abs(changes.menuOrder) > 1_000_000
      ) {
        throw new InvalidPageError("Menu order must be a whole number");
      }
      this.props.menuOrder = changes.menuOrder;
    }
  }

  // Raw JSON from the panel; rich text cleaned with `sanitize`
  setSettings(raw: unknown, sanitize: (html: string) => string): void {
    const settings = checkPageSettings(raw);
    this.props.settings = {
      ...settings,
      blocks: sanitizeBlocks(settings.blocks, sanitize),
    };
  }

  blocks(): Block[] {
    return this.props.settings.blocks;
  }

  fileKeys(): string[] {
    return settingsFileKeys(this.props.settings);
  }

  assetKeys(): string[] {
    return blockAssetKeys(this.props.settings.blocks);
  }

  // Changing it moves the page's URL and every URL below it
  setSlug(slug: string | null): void {
    const next = slug === null ? null : toSlug(slug);
    if (next === null && this.isLive) {
      throw new LivePageNeedsSlugError();
    }
    if (this.props.parentId === null) {
      checkNotReserved(next);
    }
    this.props.slug = next;
  }

  // `targetInsideSubtree`: the new parent is this page or below it
  moveTo(parentId: bigint | null, targetInsideSubtree: boolean): void {
    if (
      parentId !== null &&
      (parentId === this.props.id || targetInsideSubtree)
    ) {
      throw new MovePageIntoItselfError();
    }
    if (parentId === null) {
      checkNotReserved(this.props.slug);
    }
    this.props.parentId = parentId;
  }

  // `at` in the future schedules it
  publish(
    now: Date,
    facts: {
      parentReachable: boolean;
      hasPrivateFiles: boolean;
    },
    at?: Date,
  ): void {
    if (this.props.slug === null || !facts.parentReachable) {
      throw new PageNotReachableError();
    }
    if (facts.hasPrivateFiles) {
      throw new PrivateFilesInPageError();
    }
    const when = at ?? now;
    this.props.status =
      when.getTime() > now.getTime() ? "scheduled" : "published";
    this.props.publishedAt = when.toISOString();
  }

  unpublish(): void {
    this.props.status = "draft";
    this.props.publishedAt = null;
  }

  delete(now: Date, hasChildren: boolean): void {
    if (hasChildren) {
      throw new PageHasChildrenError();
    }
    this.props.deletedAt = now.toISOString();
  }
}

export function checkTitle(title: string): string {
  const clean = title.trim();
  if (!clean || clean.length > 255) {
    throw new InvalidPageError("Title must be 1 to 255 characters");
  }
  return clean;
}

function checkDescription(description: string | null): string | null {
  const clean = description?.trim() ?? "";
  if (clean.length > 500) {
    throw new InvalidPageError("Description must be at most 500 characters");
  }
  return clean || null;
}

// Same rules as post slugs: 'About Us' -> 'about-us'; '/' is allowed
export function toSlug(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "");
  // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting them
  // oxlint-disable-next-line no-control-regex
  if (!slug || slug.length > 255 || /[\u0000-\u001f\u007f?#]/.test(slug)) {
    throw new InvalidPageError(
      "Slug must be 1 to 255 characters, without ? or #",
    );
  }
  return slug;
}
