import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import { textParam } from "@/lib/search";
import type { Page, PageLayout, PageSummary } from "@/lib/types";
import { loadChoices } from "@/routes/admin/_auth/pages/-lib/choices";
import { PageEditor } from "@/routes/admin/_auth/pages/-lib/page-editor";
import { StaffOnly } from "@/routes/admin/_auth/pages/-lib/staff";

export const Route = createFileRoute("/admin/_auth/pages/$id")({
  // Set when creating saved the page but not the rest (createPage)
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    error?: string;
  } => ({
    error: textParam(s.error),
  }),
  loader: async ({ context, params }) => {
    if (!isStaff(context.user)) {
      return null;
    }
    if (!/^[1-9]\d*$/.test(params.id)) {
      throw notFound();
    }
    const [page, pages, layouts, choices] = await Promise.all([
      api<Page>(`/pages/${params.id}`),
      api<PageSummary[]>("/pages"),
      api<PageLayout[]>("/page-layouts"),
      loadChoices(),
    ]);
    if (page.status !== "success" || !page.data) {
      throw notFound();
    }
    return {
      page: page.data,
      pages: pages.status === "success" ? (pages.data ?? []) : [],
      layouts: layouts.status === "success" ? (layouts.data ?? []) : [],
      choices,
    };
  },
  head: () => ({
    meta: [
      {
        title: "Edit page",
      },
    ],
  }),
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: EditPagePage,
});

function EditPagePage() {
  const data = Route.useLoaderData();
  const { error } = Route.useSearch();
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
          // Fresh editor state after saving or publishing
          key={data.page.updatedAt}
          page={data.page}
          pages={data.pages}
          layouts={data.layouts}
          choices={data.choices}
          error={error}
        />
      ) : (
        <StaffOnly />
      )}
    </div>
  );
}
