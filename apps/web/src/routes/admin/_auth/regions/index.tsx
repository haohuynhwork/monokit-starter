import { isCountry } from "@packages/geo";
import { createFileRoute } from "@tanstack/react-router";
import { Empty, NotStaff } from "@/components/pager";
import { api } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import { textParam } from "@/lib/search";
import type { Region } from "@/lib/types";
import { RegionList } from "@/routes/admin/_auth/regions/-lib/region-list";

export const Route = createFileRoute("/admin/_auth/regions/")({
  validateSearch: (s: Record<string, unknown>) => ({
    country: textParam(s.country),
  }),
  loaderDeps: ({ search }) => ({
    country: search.country,
  }),
  loader: async ({ context, deps }) => {
    const wanted = (deps.country ?? "").toUpperCase();
    const country = isCountry(wanted) ? wanted : "VN";
    if (!isStaff(context.user)) {
      return {
        staff: false,
        error: null,
        country,
        regions: [] as Region[],
      };
    }
    const res = await api<Region[]>(`/regions?country=${country}`);
    return res.status === "success"
      ? {
          staff: true,
          error: null,
          country,
          regions: res.data ?? [],
        }
      : {
          staff: true,
          error: res.message ?? "Could not load regions.",
          country,
          regions: [] as Region[],
        };
  },
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: RegionsPage,
});

function RegionsPage() {
  const { staff, error, country, regions } = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Regions</h1>
        <p className="text-sm text-muted-foreground">
          The provinces (and wards) customers pick in their addresses.
          Deactivate a region to hide it; addresses that use it keep it.
        </p>
      </div>
      {!staff ? (
        <NotStaff />
      ) : error ? (
        <Empty>{error}</Empty>
      ) : (
        <RegionList key={country} country={country} regions={regions} />
      )}
    </div>
  );
}
