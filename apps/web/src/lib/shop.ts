import { useEffect, useState } from "react";
import { api, type FormState } from "./api";

export { isStaff } from "./auth";

// Forms' result; the name the web panel used
export type ShopActionState = FormState;

// GET /configs/public, shared by the calls below while it's in flight or
// loaded; dropped on failure so the next call retries
let publicConfigs: Promise<Record<string, unknown>> | null = null;
function fetchPublicConfigs(): Promise<Record<string, unknown>> {
  publicConfigs ??= api<Record<string, unknown>>("/configs/public").then(
    (res) => {
      if (res.status !== "success") {
        publicConfigs = null;
        return {};
      }
      return res.data ?? {};
    },
  );
  return publicConfigs;
}

// Call after changing settings, so the next read loads them again
export function forgetPublicConfigs() {
  publicConfigs = null;
}

// The shop currency prices are entered in (configs 'shop.currency')
export async function fetchShopCurrency(): Promise<string> {
  const currency = (await fetchPublicConfigs())["shop.currency"];
  return typeof currency === "string" ? currency : "USD";
}

// Where the shop ships (configs 'shipping.countries'); null means anywhere
export async function fetchShippingCountries(): Promise<string[] | null> {
  const countries = (await fetchPublicConfigs())["shipping.countries"];
  return Array.isArray(countries) ? (countries as string[]) : null;
}

// The shop currency in a component; "USD" until it has loaded. Loaders can
// await fetchShopCurrency() instead, so the first render has it.
export function useShopCurrency(): string {
  const [currency, setCurrency] = useState("USD");
  useEffect(() => {
    let live = true;
    void fetchShopCurrency().then((c) => {
      if (live) {
        setCurrency(c);
      }
    });
    return () => {
      live = false;
    };
  }, []);
  return currency;
}
