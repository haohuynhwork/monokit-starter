import { DomainError } from "./domain-error.js";

// Pages and posts share one URL space on the site (ideas/pages "One URL
// namespace"). These first segments belong to the app's own routes.
export const RESERVED_SEGMENTS = [
  "panel",
  "login",
  "register",
  "logout",
  "posts",
  "tags",
  "products",
  "orders",
  "account",
  "files",
  "api",
  "_next",
] as const;

export class ReservedPathError extends DomainError {
  readonly code = "reserved_path";
  readonly kind = "invalid";
  constructor(segment: string) {
    super(`"/${segment}" is used by the site itself; pick another slug`);
  }
}

export class PathTakenError extends DomainError {
  readonly code = "path_taken";
  readonly kind = "conflict";
  constructor(by: "post" | "page") {
    super(`Another ${by} already has this path`);
  }
}

// '<parent path>/<slug>', or null while either part is missing
export function joinPath(
  parentPath: string | null,
  slug: string | null,
  isRoot: boolean,
): string | null {
  if (slug === null) {
    return null;
  }
  if (isRoot) {
    return slug;
  }
  return parentPath === null ? null : `${parentPath}/${slug}`;
}

export function checkNotReserved(path: string | null): void {
  const first = path?.split("/")[0];
  if (first && (RESERVED_SEGMENTS as readonly string[]).includes(first)) {
    throw new ReservedPathError(first);
  }
}
