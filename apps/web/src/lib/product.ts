import { formatMoney } from "./money";
import type { Product, ProductVariant } from "./types";

// The variant with exactly these option values, if there is one
export function findVariant(
  product: Pick<Product, "variants">,
  values: Record<string, string>,
): ProductVariant | undefined {
  return product.variants.find((v) =>
    Object.entries(v.values).every(([k, val]) => values[k] === val),
  );
}

// Where the page starts: the first variant in stock, else the first
export function defaultVariant(
  product: Pick<Product, "variants">,
): ProductVariant | undefined {
  return product.variants.find((v) => v.inStock) ?? product.variants[0];
}

// "19.99", or "9.99 – 19.99" when the variants differ
export function priceRange(
  product: Pick<Product, "priceMin" | "priceMax">,
  currency: string,
): string {
  return product.priceMin === product.priceMax
    ? formatMoney(product.priceMin, currency)
    : `${formatMoney(product.priceMin, currency)} – ${formatMoney(product.priceMax, currency)}`;
}

// Staff: the summed stock of tracked variants, null when none is tracked
export function trackedStock(
  product: Pick<Product, "variants">,
): number | null {
  const tracked = product.variants.filter((v) => v.trackStock);
  return tracked.length
    ? tracked.reduce((n, v) => n + (v.stock ?? 0), 0)
    : null;
}
