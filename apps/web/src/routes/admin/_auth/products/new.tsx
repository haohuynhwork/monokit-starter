import { createFileRoute, Link } from "@tanstack/react-router";
import { NotStaff } from "@/components/pager";
import { api } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import { fetchShopCurrency } from "@/lib/shop";
import type { Category } from "@/lib/types";
import { ProductEditor } from "@/routes/admin/_auth/products/-lib/product-editor";

export const Route = createFileRoute("/admin/_auth/products/new")({
  loader: async ({ context }) => {
    if (!isStaff(context.user)) {
      return {
        notStaff: true as const,
      };
    }
    const [cats, currency] = await Promise.all([
      api<Category[]>("/categories"),
      fetchShopCurrency(),
    ]);
    return {
      notStaff: false as const,
      categories: cats.status === "success" && cats.data ? cats.data : [],
      currency,
    };
  },
  pendingComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">Loading…</p>
    </Shell>
  ),
  component: NewProductPage,
});

function NewProductPage() {
  const data = Route.useLoaderData();
  return (
    <Shell>
      {data.notStaff ? (
        <NotStaff />
      ) : (
        <ProductEditor
          product={null}
          categories={data.categories}
          currency={data.currency}
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/admin/products"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Products
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">New product</h1>
      {children}
    </div>
  );
}
