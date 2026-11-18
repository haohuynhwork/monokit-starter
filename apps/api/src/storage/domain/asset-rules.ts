import {
  AssetForbiddenError,
  InvalidLinkUrlError,
  InvalidNameError,
  MoveIntoItselfError,
  NotAFolderError,
  NotALinkError,
} from "./asset.errors.js";
import type { Actor, AssetNode } from "./asset.js";

// Display name, as typed (e.g. 'Q1/Q2 Report.pdf')
export function checkName(name: string): string {
  const clean = name.trim();
  // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting them
  // oxlint-disable-next-line no-control-regex
  if (!clean || clean.length > 255 || /[\u0000-\u001f\u007f]/.test(clean)) {
    throw new InvalidNameError();
  }
  return clean;
}

// URL name from a display name: lowercase, spaces to '-'. May keep '/'
// (see ideas/storage: slugs may contain '/', full_slug is lookup-only).
export function toSlug(name: string): string {
  const slug = checkName(name)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "item";
}

// 'logo.png' is taken -> 'logo-2.png', 'logo-3.png', ...; the suffix goes
// before a file extension so the name still reads as that type
export function slugCandidates(base: string, count = 50): string[] {
  const match = /^(.+?)(\.[a-z0-9]{1,8})?$/.exec(base.slice(0, 240));
  const stem = match?.[1] ?? base;
  const ext = match?.[2] ?? "";
  return [
    stem + ext,
    ...Array.from(
      {
        length: count - 1,
      },
      (_, i) => `${stem}-${i + 2}${ext}`,
    ),
  ];
}

export function checkLinkUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    // fall through
  }
  throw new InvalidLinkUrlError();
}

// Only folders contain items
export function checkParent(parent: AssetNode | null): void {
  if (parent && parent.kind !== "directory") {
    throw new NotAFolderError();
  }
}

// `targetInsideAsset`: the target folder is the asset or one of its
// descendants, which would make the tree a loop
export function checkMove(
  asset: AssetNode,
  target: AssetNode | null,
  targetInsideAsset: boolean,
): void {
  checkParent(target);
  if (target && (target.id === asset.id || targetInsideAsset)) {
    throw new MoveIntoItselfError();
  }
}

// asset:manage:any manages everything; everyone else only what they created
// (ideas/users)
export function checkCanManage(actor: Actor, asset: AssetNode): void {
  if (actor === null || actor.permissions.has("asset:manage:any")) {
    return;
  }
  if (asset.createdById !== actor.id) {
    throw new AssetForbiddenError();
  }
}

// Only links point at a URL; files keep their stored bytes
export function checkIsLink(asset: AssetNode): void {
  if (asset.kind !== "link") {
    throw new NotALinkError();
  }
}
