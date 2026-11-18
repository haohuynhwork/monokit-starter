import { createFileRoute, Link } from "@tanstack/react-router";
import { isStaff } from "@/lib/auth";
import { loadChoices } from "@/routes/admin/_auth/pages/-lib/choices";
import {
  LayoutEditor,
  NEW_LAYOUT,
} from "@/routes/admin/_auth/pages/-lib/layout-editor";
import { StaffOnly } from "@/routes/admin/_auth/pages/-lib/staff";

// A blank editor; createLayout makes the layout on the first save
export const Route = createFileRoute("/admin/_auth/pages/layouts/new")({
  loader: async ({ context }) =>
    isStaff(context.user) ? await loadChoices() : null,
  head: () => ({
    meta: [
      {
        title: "New layout",
      },
    ],
  }),
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: NewLayoutPage,
});

function NewLayoutPage() {
  const choices = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/admin/pages/layouts"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Layouts
      </Link>
      {choices ? (
        <LayoutEditor layout={NEW_LAYOUT} choices={choices} />
      ) : (
        <StaffOnly />
      )}
    </div>
  );
}
