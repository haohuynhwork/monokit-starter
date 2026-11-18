import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { fetchShippingCountries } from "@/lib/shop";
import type { SavedAddress } from "@/lib/types";
import { AddressList } from "@/routes/admin/_auth/account/-lib/address-list";

// Any signed-in user (the _auth layout sends others to /login)
export const Route = createFileRoute("/admin/_auth/account/addresses")({
  loader: async () => {
    const [res, allowedCountries] = await Promise.all([
      api<SavedAddress[]>("/me/addresses"),
      fetchShippingCountries(),
    ]);
    return res.status === "success"
      ? {
          error: null,
          addresses: res.data ?? [],
          allowedCountries,
        }
      : {
          error: res.message ?? "unknown error",
          addresses: [],
          allowedCountries,
        };
  },
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: AddressesPage,
});

function AddressesPage() {
  const { error, addresses, allowedCountries } = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Addresses</h1>
        <p className="text-sm text-muted-foreground">
          Where your orders are shipped. Orders keep their own copy.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-destructive">
          Couldn&apos;t load your addresses: {error}
        </p>
      ) : (
        <AddressList
          addresses={addresses}
          allowedCountries={allowedCountries}
        />
      )}
    </div>
  );
}
