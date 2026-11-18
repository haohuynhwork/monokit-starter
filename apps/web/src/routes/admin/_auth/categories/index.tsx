import { createFileRoute } from "@tanstack/react-router";
import { Empty, NotStaff } from "@/components/pager";
import { api, type Category } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import { CategoryList } from "@/routes/admin/_auth/categories/-lib/category-list";

// Staff only; the api checks the role too. Files under -categories/ are
// this page's own components (the "-" keeps them out of the route tree).
export const Route = createFileRoute("/admin/_auth/categories/")({
  loader: async ({ context }) => {
    if (!isStaff(context.user)) {
      return {
        notStaff: true,
        error: null,
        categories: [],
      };
    }
    const res = await api<Category[]>("/categories");
    return res.status === "success"
      ? {
          notStaff: false,
          error: null,
          categories: res.data ?? [],
        }
      : {
          notStaff: false,
          error: res.message ?? "Could not load categories.",
          categories: [],
        };
  },
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { notStaff, error, categories } = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
      {notStaff ? (
        <NotStaff />
      ) : error ? (
        <Empty>{error}</Empty>
      ) : (
        <CategoryList categories={categories} />
      )}
    </div>
  );
}
