import { Button } from "@packages/ui/components/button";
import { Link } from "@tanstack/react-router";

// Page n of the current list: the same route and search params, `page`
// changed (page 1 drops it, see pageParam in lib/search.ts)
const pageSearch = (n: number) => (prev: Record<string, unknown>) => ({
  ...prev,
  page: n > 1 ? n : undefined,
});

// Prev/Next links for a paged list. The page reads `page` from its search
// params; the links keep every other param (filters).
export function Pager({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  // Shown even for one page, so the count is always visible
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav
      aria-label="Pages"
      className="flex items-center justify-end gap-2 text-sm text-muted-foreground"
    >
      <span>
        {total === 0
          ? "0"
          : `${(page - 1) * pageSize + 1}–${Math.min(total, page * pageSize)}`}{" "}
        of {total}
      </span>
      {page > 1 ? (
        <Button variant="outline" size="sm" asChild>
          {/* Typed loosely: the pager serves every list route */}
          <Link to="." search={pageSearch(page - 1) as never}>
            Previous
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Previous
        </Button>
      )}
      <span>
        {page} / {pages}
      </span>
      {page < pages ? (
        <Button variant="outline" size="sm" asChild>
          <Link to="." search={pageSearch(page + 1) as never}>
            Next
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Next
        </Button>
      )}
    </nav>
  );
}

export function NotStaff() {
  return (
    <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      Only admins and editors can manage the shop.
    </p>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
