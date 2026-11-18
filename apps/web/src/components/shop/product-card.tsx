import { cn } from "@packages/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { formatMoney } from "@/lib/money";
import type { Product, ProductVariant } from "@/lib/types";
import { WishlistButton } from "./wishlist-button";

export function ProductCard({
  product,
  currency,
}: {
  product: Product;
  currency: string;
}) {
  // The heart sits beside the link, not in it (no button inside an <a>)
  return (
    <div className="group relative flex w-full flex-col overflow-hidden rounded-lg border">
      <Link
        to="/shop/products/$slug"
        params={{
          slug: product.slug,
        }}
        className="flex flex-1 flex-col"
      >
        <div className="aspect-square w-full overflow-hidden bg-muted">
          {product.cover && (
            <img
              // Already a full path from the api (base path included)
              src={product.cover.url}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform group-hover:scale-105"
            />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <h2 className="line-clamp-2 min-h-12 font-medium group-hover:underline">
            {product.name}
          </h2>
          <Price product={product} currency={currency} />
          {product.status !== "active" ? (
            <p className="text-xs text-muted-foreground">No longer sold</p>
          ) : (
            !product.inStock && (
              <p className="text-xs text-muted-foreground">Out of stock</p>
            )
          )}
        </div>
      </Link>
      <WishlistButton
        productId={product.id}
        className="absolute top-2 right-2"
      />
    </div>
  );
}

// One variant: its price now, the list price struck through during a sale.
// Several: "From" the lowest price now.
export function Price({
  product,
  currency,
  className,
}: {
  product: Pick<Product, "variants" | "priceMin" | "priceMax">;
  currency: string;
  className?: string;
}) {
  const only = product.variants.length === 1 ? product.variants[0] : null;
  if (!only) {
    return (
      <p className={className}>
        {product.priceMin !== product.priceMax && (
          <span className="mr-1 text-sm text-muted-foreground">From</span>
        )}
        <span className="font-semibold">
          {formatMoney(product.priceMin, currency)}
        </span>
      </p>
    );
  }
  return (
    <VariantPrice variant={only} currency={currency} className={className} />
  );
}

export function VariantPrice({
  variant,
  currency,
  className,
}: {
  variant: Pick<ProductVariant, "price" | "listPrice" | "salePrice">;
  currency: string;
  className?: string;
}) {
  return (
    <p className={cn(className)}>
      <span className="font-semibold">
        {formatMoney(variant.price, currency)}
      </span>
      {variant.salePrice !== null && (
        <s className="ml-2 text-sm text-muted-foreground">
          {formatMoney(variant.listPrice, currency)}
        </s>
      )}
    </p>
  );
}

export function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span role="img" aria-label={`${value.toFixed(1)} of 5 stars`}>
      <span className="text-amber-500">{"★".repeat(full)}</span>
      <span className="text-muted-foreground/40">{"★".repeat(5 - full)}</span>
    </span>
  );
}
