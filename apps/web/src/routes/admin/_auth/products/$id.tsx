import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { NotStaff } from "@/components/pager";
import { api } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import { fetchShopCurrency } from "@/lib/shop";
import type { Category, Product } from "@/lib/types";
import { ProductEditor } from "@/routes/admin/_auth/products/-lib/product-editor";

export const Route = createFileRoute("/admin/_auth/products/$id")({
  loader: async ({ context, params }) => {
    if (!isStaff(context.user)) {
      return {
        notStaff: true as const,
      };
    }
    if (!/^[1-9]\d*$/.test(params.id)) {
      throw notFound();
    }
    const [product, cats, currency] = await Promise.all([
      api<Product>(`/products/${params.id}`),
      api<Category[]>("/categories"),
      fetchShopCurrency(),
    ]);
    if (product.status !== "success" || !product.data) {
      throw notFound();
    }
    return {
      notStaff: false as const,
      product: product.data,
      categories: cats.status === "success" && cats.data ? cats.data : [],
      currency,
    };
  },
  pendingComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">Loading…</p>
    </Shell>
  ),
  component: EditProductPage,
});

function EditProductPage() {
  const data = Route.useLoaderData();
  return (
    <Shell>
      {data.notStaff ? (
        <NotStaff />
      ) : (
        <ProductEditor
          // Fresh form state after saving
          key={data.product.updatedAt}
          product={data.product}
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
      {children}
    </div>
  );
}
