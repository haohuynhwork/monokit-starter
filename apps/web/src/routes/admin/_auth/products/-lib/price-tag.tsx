import { formatMoney } from "@/lib/money";
import { priceRange } from "@/lib/product";
import type { Product, ProductVariant } from "@/lib/types";

// A variant's price now; the list price struck through while on sale
export function PriceTag({
  variant,
  currency,
}: {
  variant: Pick<ProductVariant, "price" | "listPrice" | "salePrice">;
  currency: string;
}) {
  if (variant.salePrice === null) {
    return <>{formatMoney(variant.listPrice, currency)}</>;
  }
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <s className="text-xs text-muted-foreground">
        {formatMoney(variant.listPrice, currency)}
      </s>
      <span className="font-medium text-destructive">
        {formatMoney(variant.price, currency)}
      </span>
    </span>
  );
}

// A product's price: its one variant's tag, or the range across variants
export function ProductPrice({
  product,
  currency,
}: {
  product: Pick<Product, "variants" | "priceMin" | "priceMax">;
  currency: string;
}) {
  const only = product.variants.length === 1 ? product.variants[0] : null;
  return only ? (
    <PriceTag variant={only} currency={currency} />
  ) : (
    <>{priceRange(product, currency)}</>
  );
}
