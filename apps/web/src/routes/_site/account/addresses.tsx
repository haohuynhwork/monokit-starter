import { Alert, AlertDescription } from "@packages/ui/components/alert";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { fetchShippingCountries } from "@/lib/shop";
import type { SavedAddress } from "@/lib/types";
import { Heading, Loading } from "@/routes/_site/account/-lib/heading";
import { AddressList } from "@/routes/admin/_auth/account/-lib/address-list";

export const Route = createFileRoute("/_site/account/addresses")({
  loader: async () => {
    const [res, allowedCountries] = await Promise.all([
      api<SavedAddress[]>("/me/addresses"),
      fetchShippingCountries(),
    ]);
    return {
      error: res.status === "success" ? null : (res.message ?? "unknown error"),
      addresses: res.status === "success" ? (res.data ?? []) : [],
      allowedCountries,
    };
  },
  pendingComponent: () => (
    <>
      <Heading title="Addresses" />
      <Loading />
    </>
  ),
  head: () => ({
    meta: [
      {
        title: "Addresses",
      },
    ],
  }),
  component: AddressesPage,
});

function AddressesPage() {
  const { error, addresses, allowedCountries } = Route.useLoaderData();
  return (
    <>
      <Heading title="Addresses">
        Where your orders are shipped. Orders keep their own copy.
      </Heading>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            Couldn&apos;t load your addresses: {error}
          </AlertDescription>
        </Alert>
      ) : (
        <AddressList
          addresses={addresses}
          allowedCountries={allowedCountries}
        />
      )}
    </>
  );
}
