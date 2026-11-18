import { cn } from "@packages/ui/lib/utils";
import { createContext, use, useState } from "react";
import { VariantPrice } from "@/components/shop/product-card";
import { defaultVariant, findVariant } from "@/lib/product";
import type { Product, ProductVariant } from "@/lib/types";

type Selection = {
  product: Pick<Product, "options" | "variants">;
  values: Record<string, string>;
  // undefined: no variant has this combination
  variant: ProductVariant | undefined;
  choose: (option: string, value: string) => void;
};

const SelectionContext = createContext<Selection | null>(null);

export function useSelection(): Selection {
  const selection = use(SelectionContext);
  if (!selection) {
    throw new Error("useSelection needs a <VariantProvider>");
  }
  return selection;
}

// The chosen variant, shared by the picker, price, stock line and buy form.
// Starts on the first variant in stock.
export function VariantProvider({
  product,
  children,
}: {
  product: Pick<Product, "options" | "variants">;
  children: React.ReactNode;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    () => defaultVariant(product)?.values ?? {},
  );
  const choose = (option: string, value: string) => {
    const next = {
      ...values,
      [option]: value,
    };
    // Keep the other choices when that combination exists, else jump to
    // the first variant with the new value (in stock if possible)
    if (findVariant(product, next)) {
      setValues(next);
      return;
    }
    const withValue = product.variants.filter(
      (v) => v.values[option] === value,
    );
    const fallback = withValue.find((v) => v.inStock) ?? withValue[0];
    setValues(
      fallback
        ? {
            ...fallback.values,
          }
        : next,
    );
  };
  return (
    <SelectionContext
      value={{
        product,
        values,
        variant: findVariant(product, values),
        choose,
      }}
    >
      {children}
    </SelectionContext>
  );
}

// One row of buttons per option. A value no variant combines with the other
// choices is disabled; one whose variant is sold out is struck through.
export function VariantPicker() {
  const { product, values, choose } = useSelection();
  if (!product.options.length) {
    return null;
  }
  return (
    <div className="flex flex-col gap-3">
      {product.options.map((o) => (
        <fieldset key={o.name} className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm">
            {o.name}:{" "}
            <span className="font-medium">{values[o.name] ?? "—"}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {o.values.map((value) => {
              const variant = findVariant(product, {
                ...values,
                [o.name]: value,
              });
              const exists = product.variants.some(
                (v) => v.values[o.name] === value,
              );
              const selected = values[o.name] === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  disabled={!exists}
                  onClick={() => choose(o.name, value)}
                  className={cn(
                    "h-8 min-w-10 rounded-lg border border-input px-2.5 text-sm transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                    variant && !variant.inStock && "line-through opacity-60",
                    !exists && "cursor-not-allowed opacity-40",
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export function SelectedPrice({
  currency,
  className,
}: {
  currency: string;
  className?: string;
}) {
  const { variant } = useSelection();
  return variant ? (
    <VariantPrice variant={variant} currency={currency} className={className} />
  ) : (
    <p className={cn("text-muted-foreground", className)}>Not available</p>
  );
}

// "12 in stock" (tracked only), or "Out of stock"
export function SelectedStock() {
  const { variant } = useSelection();
  if (!variant) {
    return (
      <p className="text-sm text-muted-foreground">
        This combination isn&apos;t available.
      </p>
    );
  }
  if (!variant.inStock) {
    return <p className="text-sm font-medium text-destructive">Out of stock</p>;
  }
  return variant.stock !== null ? (
    <p className="text-sm text-muted-foreground">{variant.stock} in stock</p>
  ) : null;
}
