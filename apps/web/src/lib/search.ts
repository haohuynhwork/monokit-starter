// Search params of list pages, checked in `validateSearch` (no zod in the
// panel). Each helper takes the raw value (TanStack parses the query as JSON
// first, so "2" arrives as 2) and drops anything invalid, so links can leave
// params out and the URL stays clean:
//
//   validateSearch: (s: Record<string, unknown>) => ({
//     page: pageParam(s.page),
//     q: textParam(s.q),
//     status: oneOf(s.status, ["draft", "published"] as const),
//   }),
//
// Links then set only what changes: `search: (prev) => ({ ...prev, page: 2 })`.
// Defaults are undefined, so they don't show in the URL.

// A non-empty string (trimmed), else undefined
export function textParam(v: unknown): string | undefined {
  const s = typeof v === "number" ? String(v) : typeof v === "string" ? v : "";
  return s.trim() || undefined;
}

// Page 2 and up; page 1 is undefined (the default)
export function pageParam(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : Number.parseInt(String(v ?? ""), 10);
  return Number.isInteger(n) && n > 1 ? n : undefined;
}

// A positive whole number, e.g. a page size; else undefined
export function intParam(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : Number.parseInt(String(v ?? ""), 10);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

// An id (digits, as the api's BigInt ids), else undefined
export function idParam(v: unknown): string | undefined {
  const s = typeof v === "number" ? String(v) : typeof v === "string" ? v : "";
  return /^\d+$/.test(s) ? s : undefined;
}

// One of `allowed`, else undefined
export function oneOf<T extends string>(
  v: unknown,
  allowed: readonly T[],
): T | undefined {
  return typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : undefined;
}

// A true flag (?trashed=true or =1), else undefined
export function flagParam(v: unknown): true | undefined {
  return v === true || v === 1 || v === "1" || v === "true" ? true : undefined;
}

// The api query for a list call, dropping empty values: { page: 2, q: "x" }
// -> "?page=2&q=x"; "" when nothing is set
export function toQuery(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "" && v !== false) {
      q.set(k, String(v));
    }
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
