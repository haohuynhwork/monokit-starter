import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import type { PageLayout, PageSummary } from "@/lib/types";
import { loadChoices } from "@/routes/admin/_auth/pages/-lib/choices";
import {
  NEW_PAGE,
  PageEditor,
} from "@/routes/admin/_auth/pages/-lib/page-editor";
import { StaffOnly } from "@/routes/admin/_auth/pages/-lib/staff";

// A blank editor; createPage makes the page on the first save
export const Route = createFileRoute("/admin/_auth/pages/new")({
  loader: async ({ context }) => {
    if (!isStaff(context.user)) {
      return null;
    }
    const [pages, layouts, choices] = await Promise.all([
      api<PageSummary[]>("/pages"),
      api<PageLayout[]>("/page-layouts"),
      loadChoices(),
    ]);
    return {
      pages: pages.status === "success" ? (pages.data ?? []) : [],
      layouts: layouts.status === "success" ? (layouts.data ?? []) : [],
      choices,
    };
  },
  head: () => ({
    meta: [
      {
        title: "New page",
      },
    ],
  }),
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: NewPagePage,
});

function NewPagePage() {
  const data = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/admin/pages"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Pages
      </Link>
      {data ? (
        <PageEditor
          page={NEW_PAGE}
          pages={data.pages}
          layouts={data.layouts}
          choices={data.choices}
        />
      ) : (
        <StaffOnly />
      )}
    </div>
  );
}
