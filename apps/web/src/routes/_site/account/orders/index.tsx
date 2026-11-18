import { Alert, AlertDescription } from "@packages/ui/components/alert";
import { Badge } from "@packages/ui/components/badge";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pager } from "@/components/pager";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { pageParam } from "@/lib/search";
import type { OrderSummary } from "@/lib/types";
import { Heading, Loading } from "@/routes/_site/account/-lib/heading";
import { STATUS_LABEL } from "@/routes/admin/_auth/orders/-lib/status";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_site/account/orders/")({
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    page?: number;
  } => ({
    page: pageParam(s.page),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const page = deps.page ?? 1;
    const res = await api<OrderSummary[]>(
      `/me/orders?limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}`,
    );
    const orders = res.status === "success" && res.data ? res.data : [];
    const total =
      (
        res as {
          meta?: {
            total?: number;
          };
        }
      ).meta?.total ?? orders.length;
    return {
      error: res.status !== "success" ? (res.message ?? "Error") : null,
      orders,
      total,
    };
  },
  pendingComponent: () => (
    <>
      <Heading title="My orders" />
      <Loading />
    </>
  ),
  head: () => ({
    meta: [
      {
        title: "My orders",
      },
    ],
  }),
  component: MyOrdersPage,
});

function MyOrdersPage() {
  const { error, orders, total } = Route.useLoaderData();
  const { page } = Route.useSearch();
  return (
    <>
      <Heading title="My orders" />
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : orders.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No orders yet.{" "}
          <Link to="/shop/products" className="underline">
            Browse products
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col divide-y rounded-lg border">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  to="/account/orders/$id"
                  params={{
                    id: o.id,
                  }}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium">Order #{o.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}{" "}
                      · {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="font-medium">
                      {formatMoney(o.total, o.currency)}
                    </p>
                    <Badge variant="secondary">{STATUS_LABEL[o.status]}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Pager page={page ?? 1} pageSize={PAGE_SIZE} total={total} />
        </div>
      )}
    </>
  );
}
