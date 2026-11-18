import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import type { PageLayout } from "@/lib/types";
import { loadChoices } from "@/routes/admin/_auth/pages/-lib/choices";
import { LayoutEditor } from "@/routes/admin/_auth/pages/-lib/layout-editor";
import { StaffOnly } from "@/routes/admin/_auth/pages/-lib/staff";

export const Route = createFileRoute("/admin/_auth/pages/layouts/$id")({
  loader: async ({ context, params }) => {
    if (!isStaff(context.user)) {
      return null;
    }
    if (!/^[1-9]\d*$/.test(params.id)) {
      throw notFound();
    }
    const [layout, choices] = await Promise.all([
      api<PageLayout>(`/page-layouts/${params.id}`),
      loadChoices(),
    ]);
    if (layout.status !== "success" || !layout.data) {
      throw notFound();
    }
    return {
      layout: layout.data,
      choices,
    };
  },
  head: () => ({
    meta: [
      {
        title: "Edit layout",
      },
    ],
  }),
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: EditLayoutPage,
});

function EditLayoutPage() {
  const data = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/admin/pages/layouts"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Layouts
      </Link>
      {data ? (
        <LayoutEditor
          key={data.layout.updatedAt}
          layout={data.layout}
          choices={data.choices}
        />
      ) : (
        <StaffOnly />
      )}
    </div>
  );
}
