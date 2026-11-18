import { Badge } from "@packages/ui/components/badge";
import { Button } from "@packages/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import type { PageLayout, PageSummary } from "@/lib/types";
import { NewItem } from "@/routes/admin/_auth/pages/-lib/new-item";
import { StaffOnly } from "@/routes/admin/_auth/pages/-lib/staff";

// Pages are site structure: editors and admins only (the api checks too)
export const Route = createFileRoute("/admin/_auth/pages/")({
  loader: async ({ context }) => {
    if (!isStaff(context.user)) {
      return {
        staff: false as const,
      };
    }
    const [pages, layouts] = await Promise.all([
      api<PageSummary[]>("/pages"),
      api<PageLayout[]>("/page-layouts"),
    ]);
    return {
      staff: true as const,
      pages:
        pages.status === "success" && pages.data
          ? pages.data
          : (pages.message ?? "Couldn't load pages."),
      layouts: layouts.status === "success" ? (layouts.data ?? []) : [],
    };
  },
  head: () => ({
    meta: [
      {
        title: "Pages",
      },
    ],
  }),
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: PagesPage,
});

function PagesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Pages</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/pages/layouts">Layouts</Link>
          </Button>
          <NewItem kind="page" />
        </div>
      </div>
      <Tree />
    </div>
  );
}

function Tree() {
  const data = Route.useLoaderData();
  if (!data.staff) {
    return <StaffOnly />;
  }
  if (typeof data.pages === "string") {
    return <p className="text-sm text-destructive">{data.pages}</p>;
  }
  const layoutName = new Map(
    data.layouts.map((l) => [
      l.id,
      l.name,
    ]),
  );
  const rows = treeOrder(data.pages);
  if (!rows.length) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No pages yet.
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {rows.map(({ page, depth }) => (
        <li
          key={page.id}
          className="flex flex-wrap items-center gap-3 px-4 py-3"
        >
          <Link
            to="/admin/pages/$id"
            params={{
              id: page.id,
            }}
            className="font-medium hover:underline"
            style={{
              paddingLeft: `${depth * 1.25}rem`,
            }}
          >
            {depth > 0 && <span className="text-muted-foreground">└ </span>}
            {page.title}
          </Link>
          <span className="font-mono text-xs text-muted-foreground">
            {page.path ? `/${page.path}` : "no URL"}
          </span>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            {page.showInMenu && <Badge variant="outline">menu</Badge>}
            <span>
              {page.layoutId ? layoutName.get(page.layoutId) : "Default layout"}
            </span>
            <Badge variant={page.live ? "default" : "secondary"}>
              {page.live ? "live" : page.status}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}

// Parents before their children, siblings in the api's order
function treeOrder(pages: PageSummary[]) {
  const byParent = new Map<string | null, PageSummary[]>();
  for (const p of pages) {
    const list = byParent.get(p.parentId) ?? [];
    list.push(p);
    byParent.set(p.parentId, list);
  }
  const out: {
    page: PageSummary;
    depth: number;
  }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const page of byParent.get(parentId) ?? []) {
      out.push({
        page,
        depth,
      });
      walk(page.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
