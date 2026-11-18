import { Button } from "@packages/ui/components/button";
import { Input } from "@packages/ui/components/input";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Pager } from "@/components/pager";
import { ProductCard } from "@/components/shop/product-card";
import { idParam, oneOf, pageParam, textParam } from "@/lib/search";
import {
  getShopCategories,
  getShopCurrency,
  listShopProducts,
  PRODUCT_SORTS,
  type ProductSort,
} from "@/lib/site/public-shop";

const PAGE_SIZE = 24;

type ProductsSearch = {
  q?: string;
  category?: string;
  sort?: ProductSort;
  page?: number;
};

// The public catalog: filters live in the URL
export const Route = createFileRoute("/_site/shop/products/")({
  validateSearch: (s: Record<string, unknown>): ProductsSearch => ({
    q: textParam(s.q),
    category: idParam(s.category),
    sort: oneOf(s.sort, Object.keys(PRODUCT_SORTS) as ProductSort[]),
    page: pageParam(s.page),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [categories, products, currency] = await Promise.all([
      getShopCategories(),
      listShopProducts({
        data: {
          q: deps.q,
          categoryId: deps.category,
          sort: deps.sort,
          limit: PAGE_SIZE,
          offset: ((deps.page ?? 1) - 1) * PAGE_SIZE,
        },
      }),
      getShopCurrency(),
    ]);
    return {
      categories,
      products,
      currency,
    };
  },
  head: () => ({
    meta: [
      {
        title: "Products",
      },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { categories, products, currency } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({
    from: Route.fullPath,
  });
  const sort = search.sort ?? "newest";
  const page = search.page ?? 1;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Products</h1>
      <div className="flex flex-col gap-4">
        <form
          noValidate
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const chosen = oneOf(
              data.get("sort"),
              Object.keys(PRODUCT_SORTS) as ProductSort[],
            );
            void navigate({
              search: (prev) => ({
                ...prev,
                q: textParam(data.get("q")),
                sort: chosen === "newest" ? undefined : chosen,
                page: undefined,
              }),
            });
          }}
        >
          <Input
            name="q"
            // Remounted when the URL's value changes
            key={search.q ?? ""}
            defaultValue={search.q ?? ""}
            placeholder="Search products"
            className="w-full sm:w-64"
          />
          <select
            name="sort"
            defaultValue={sort}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            {Object.entries(PRODUCT_SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline">
            Apply
          </Button>
        </form>

        {categories.length > 0 && (
          <nav aria-label="Categories" className="flex flex-wrap gap-2">
            <CategoryLink category={undefined} active={!search.category}>
              All
            </CategoryLink>
            {categories.map((c) => (
              <CategoryLink
                key={c.id}
                category={c.id}
                active={c.id === search.category}
              >
                {c.name}
              </CategoryLink>
            ))}
          </nav>
        )}

        {products.data.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No products found.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.data.map((p) => (
              <li key={p.id} className="flex">
                <ProductCard product={p} currency={currency} />
              </li>
            ))}
          </ul>
        )}
        <Pager page={page} pageSize={PAGE_SIZE} total={products.total} />
      </div>
    </main>
  );
}

function CategoryLink({
  category,
  active,
  children,
}: {
  category: string | undefined;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button variant={active ? "default" : "outline"} size="sm" asChild>
      <Link
        to="/shop/products"
        search={(prev: ProductsSearch) => ({
          ...prev,
          category,
          page: undefined,
        })}
        aria-current={active ? "page" : undefined}
      >
        {children}
      </Link>
    </Button>
  );
}
