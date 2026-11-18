import { Badge } from "@packages/ui/components/badge";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import type { PageLayout } from "@/lib/types";
import { TEMPLATE_LABELS } from "@/routes/admin/_auth/pages/-lib/layout-fields";
import { NewItem } from "@/routes/admin/_auth/pages/-lib/new-item";
import { StaffOnly } from "@/routes/admin/_auth/pages/-lib/staff";

export const Route = createFileRoute("/admin/_auth/pages/layouts/")({
  loader: async ({ context }) => {
    if (!isStaff(context.user)) {
      return {
        staff: false as const,
      };
    }
    const res = await api<PageLayout[]>("/page-layouts");
    return {
      staff: true as const,
      layouts:
        res.status === "success" && res.data
          ? res.data
          : (res.message ?? "Couldn't load layouts."),
    };
  },
  head: () => ({
    meta: [
      {
        title: "Page layouts",
      },
    ],
  }),
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: LayoutsPage,
});

function LayoutsPage() {
  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/admin/pages"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Pages
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Layouts</h1>
          <p className="text-sm text-muted-foreground">
            Shared frames for pages: template, header and footer, sidebar.
          </p>
        </div>
        <NewItem kind="layout" />
      </div>
      <List />
    </div>
  );
}

function List() {
  const data = Route.useLoaderData();
  if (!data.staff) {
    return <StaffOnly />;
  }
  if (typeof data.layouts === "string") {
    return <p className="text-sm text-destructive">{data.layouts}</p>;
  }
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {data.layouts.map((l) => (
        <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Link
            to="/admin/pages/layouts/$id"
            params={{
              id: l.id,
            }}
            className="font-medium hover:underline"
          >
            {l.name}
          </Link>
          {l.isDefault && <Badge>default</Badge>}
          <span className="text-sm text-muted-foreground">
            {TEMPLATE_LABELS[l.settings.template ?? "default"]}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {l.pageCount} page{l.pageCount === 1 ? "" : "s"}
          </span>
        </li>
      ))}
    </ul>
  );
}
