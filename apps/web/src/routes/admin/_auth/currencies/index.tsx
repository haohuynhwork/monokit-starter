import { createFileRoute } from "@tanstack/react-router";
import { Empty, NotStaff } from "@/components/pager";
import { api } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import type { Currencies } from "@/lib/types";
import { CurrencyList } from "@/routes/admin/_auth/currencies/-lib/currency-list";

export const Route = createFileRoute("/admin/_auth/currencies/")({
  loader: async ({ context }) => {
    if (!isStaff(context.user)) {
      return {
        staff: false,
        error: null,
        data: null,
      };
    }
    const res = await api<Currencies>("/currencies");
    return res.status === "success" && res.data
      ? {
          staff: true,
          error: null,
          data: res.data,
        }
      : {
          staff: true,
          error: res.message ?? "Could not load currencies.",
          data: null,
        };
  },
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: CurrenciesPage,
});

function CurrenciesPage() {
  const { staff, error, data } = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Currencies</h1>
        <p className="text-sm text-muted-foreground">
          Prices are stored in the base currency (Settings → Currency). Rates
          convert them for display: 1 base = rate of the other currency.
        </p>
      </div>
      {!staff ? (
        <NotStaff />
      ) : error || !data ? (
        <Empty>{error ?? "Could not load currencies."}</Empty>
      ) : (
        <CurrencyList base={data.base} currencies={data.items} />
      )}
    </div>
  );
}
