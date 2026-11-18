import { Button } from "@packages/ui/components/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { emptyText } from "@/components/empty-row";
import { Empty, NotStaff, Pager } from "@/components/pager";
import { api } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import { oneOf, pageParam, textParam, toQuery } from "@/lib/search";
import type { OrderStatus, OrderSummary } from "@/lib/types";
import { OrdersTable } from "@/routes/admin/_auth/orders/-lib/orders-table";
import { STATUS_LABEL } from "@/routes/admin/_auth/orders/-lib/status";

const PAGE_SIZE = 20;
const STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];

// Optional keys: links can leave any of them out
type OrdersSearch = {
  q?: string;
  status?: OrderStatus;
  page?: number;
};

// Staff only; the api checks the role too
export const Route = createFileRoute("/admin/_auth/orders/")({
  validateSearch: (s: Record<string, unknown>): OrdersSearch => ({
    q: textParam(s.q),
    status: oneOf(s.status, STATUSES),
    page: pageParam(s.page),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    if (!isStaff(context.user)) {
      return {
        notStaff: true as const,
      };
    }
    const page = deps.page ?? 1;
    const res = await api<OrderSummary[]>(
      `/orders${toQuery({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        q: deps.q,
        status: deps.status,
      })}`,
    );
    const orders = res.status === "success" && res.data ? res.data : [];
    const total =
      (
        res as {
          meta?: {
            total: number;
          };
        }
      ).meta?.total ?? orders.length;
    return {
      notStaff: false as const,
      error:
        res.status !== "success"
          ? (res.message ?? "Could not load orders.")
          : null,
      orders,
      total,
    };
  },
  pendingComponent: () => (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  ),
  component: OrdersPage,
});

function OrdersPage() {
  const data = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      {data.notStaff ? <NotStaff /> : <Loaded {...data} />}
    </div>
  );
}

function Loaded({
  error,
  orders,
  total,
}: {
  error: string | null;
  orders: OrderSummary[];
  total: number;
}) {
  const { q, status, page = 1 } = Route.useSearch();
  const navigate = useNavigate();
  // The filter form sets the search params (page back to 1)
  const filter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    void navigate({
      to: "/admin/orders",
      search: {
        q: textParam(form.get("q")),
        status: oneOf(form.get("status"), STATUSES),
      },
    });
  };

  return (
    <>
      <form
        noValidate
        onSubmit={filter}
        // Fresh defaults when the params change (e.g. back button)
        key={`${q}:${status}`}
        className="flex flex-wrap gap-2"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Order #, recipient name or phone"
          className="h-8 min-w-60 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          aria-label="Status"
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
        >
          <option value="">Any status</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Filter
        </Button>
      </form>

      {error ? (
        <Empty>{error}</Empty>
      ) : (
        <OrdersTable
          key={`${page}:${q}:${status}`}
          orders={orders}
          empty={emptyText(
            "orders",
            !!(q || status),
            "Orders appear here when customers check out.",
          )}
        />
      )}

      <Pager page={page} pageSize={PAGE_SIZE} total={total} />
    </>
  );
}
