import { Button } from "@packages/ui/components/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import type { FormEvent } from "react";
import { emptyText } from "@/components/empty-row";
import { Empty, NotStaff, Pager } from "@/components/pager";
import { api } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import { idParam, oneOf, pageParam, textParam, toQuery } from "@/lib/search";
import { fetchShopCurrency } from "@/lib/shop";
import type { Category, Product } from "@/lib/types";
import { ProductsTable } from "@/routes/admin/_auth/products/-lib/products-table";

const PAGE_SIZE = 20;
const STATUSES = [
  "draft",
  "active",
  "archived",
] as const;

// Optional keys: links can leave any of them out
type ProductsSearch = {
  q?: string;
  status?: (typeof STATUSES)[number];
  categoryId?: string;
  page?: number;
};

// Staff only; the api checks the role too
export const Route = createFileRoute("/admin/_auth/products/")({
  validateSearch: (s: Record<string, unknown>): ProductsSearch => ({
    q: textParam(s.q),
    status: oneOf(s.status, STATUSES),
    categoryId: idParam(s.categoryId),
    page: pageParam(s.page),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    if (!isStaff(context.user)) {
      return {
        notStaff: true as const,
      };
    }
    const { q, status, categoryId } = deps;
    const page = deps.page ?? 1;
    const [res, cats, currency] = await Promise.all([
      api<Product[]>(
        `/products${toQuery({
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
          q,
          status,
          categoryId,
        })}`,
      ),
      api<Category[]>("/categories"),
      fetchShopCurrency(),
    ]);
    const products = res.status === "success" && res.data ? res.data : [];
    const total =
      (
        res as {
          meta?: {
            total: number;
          };
        }
      ).meta?.total ?? products.length;
    return {
      notStaff: false as const,
      error:
        res.status !== "success"
          ? (res.message ?? "Could not load products.")
          : null,
      products,
      total,
      categories: cats.status === "success" && cats.data ? cats.data : [],
      currency,
    };
  },
  pendingComponent: () => (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  ),
  component: ProductsPage,
});

function ProductsPage() {
  const data = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
      {data.notStaff ? <NotStaff /> : <Loaded {...data} />}
    </div>
  );
}

function Loaded({
  error,
  products,
  total,
  categories,
  currency,
}: {
  error: string | null;
  products: Product[];
  total: number;
  categories: Category[];
  currency: string;
}) {
  const { q, status, categoryId, page = 1 } = Route.useSearch();
  const navigate = useNavigate();
  // The filter form sets the search params (page back to 1)
  const filter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    void navigate({
      to: "/admin/products",
      search: {
        q: textParam(form.get("q")),
        status: oneOf(form.get("status"), STATUSES),
        categoryId: idParam(form.get("categoryId")),
      },
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <form
          noValidate
          onSubmit={filter}
          // Fresh defaults when the params change (e.g. back button)
          key={`${q}:${status}:${categoryId}`}
          className="flex flex-1 flex-wrap gap-2"
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name or SKU"
            className="h-8 min-w-60 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          />
          <select
            name="status"
            defaultValue={status ?? ""}
            aria-label="Status"
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Any status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <select
            name="categoryId"
            defaultValue={categoryId ?? ""}
            aria-label="Category"
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm">
            Filter
          </Button>
        </form>
        <Button size="sm" asChild>
          <Link to="/admin/products/new">
            <Plus /> New product
          </Link>
        </Button>
      </div>

      {error ? (
        <Empty>{error}</Empty>
      ) : (
        <ProductsTable
          key={`${page}:${q}:${status}:${categoryId}`}
          products={products}
          categories={categories}
          currency={currency}
          empty={emptyText(
            "products",
            !!(q || status || categoryId),
            "Add the first one with “New product”.",
          )}
        />
      )}

      <Pager page={page} pageSize={PAGE_SIZE} total={total} />
    </>
  );
}
