import { Button } from "@packages/ui/components/button";
import { cn } from "@packages/ui/lib/utils";
import { Link, useRouter } from "@tanstack/react-router";
import { ImageOff, Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { notify } from "@/components/toast";
import { formatMoney } from "@/lib/money";
import { MAX_QUANTITY } from "@/lib/site/guest";
import {
  removeFromCart,
  type ShopResult,
  setCartQuantity,
} from "@/lib/site/shop-client";
import type { CartLine } from "@/lib/types";

// The cart's lines with a tick each: only ticked, available lines go to
// /checkout. Unavailable lines can't be ticked.
export function CartLines({
  items,
  currency,
  selected,
  onSelect,
}: {
  items: CartLine[];
  currency: string;
  selected: ReadonlySet<string>;
  onSelect: (variantId: string, on: boolean) => void;
}) {
  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {items.map((item) => (
        <Line
          key={item.variantId}
          item={item}
          currency={currency}
          checked={item.available && selected.has(item.variantId)}
          onCheck={(on) => onSelect(item.variantId, on)}
        />
      ))}
    </ul>
  );
}

function Line({
  item,
  currency,
  checked,
  onCheck,
}: {
  item: CartLine;
  currency: string;
  checked: boolean;
  onCheck: (on: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const { product, variant } = item;
  // Tracked stock caps the stepper
  const max = Math.min(MAX_QUANTITY, variant?.stock ?? MAX_QUANTITY);
  const run = async (change: () => Promise<ShopResult>) => {
    setPending(true);
    const res = await change();
    if (res.ok) {
      await router.invalidate();
    } else {
      notify("Couldn't update the cart", {
        kind: "error",
        description: res.message,
      });
    }
    setPending(false);
  };
  const setQuantity = (n: number) =>
    run(() => setCartQuantity(item.variantId, n));
  const name = product?.name ?? "Unavailable product";

  return (
    <li
      className={cn(
        "flex gap-4 p-4 transition-opacity",
        pending && "opacity-60",
      )}
    >
      <input
        type="checkbox"
        aria-label={`Pay for ${name}`}
        checked={checked}
        disabled={!item.available}
        onChange={(e) => onCheck(e.target.checked)}
        className="mt-8 size-4 shrink-0 accent-primary"
      />
      <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {variant?.imageUrl ? (
          <img
            src={variant.imageUrl}
            alt=""
            className={cn(
              "size-full object-cover",
              !item.available && "grayscale",
            )}
          />
        ) : (
          <ImageOff className="size-6 text-muted-foreground" />
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {product ? (
              <Link
                to="/shop/products/$slug"
                params={{
                  slug: product.slug,
                }}
                className="line-clamp-2 font-medium hover:underline"
              >
                {name}
              </Link>
            ) : (
              <span className="font-medium text-muted-foreground">{name}</span>
            )}
            {variant?.name && (
              <p className="text-sm text-muted-foreground">{variant.name}</p>
            )}
          </div>
          <p className="shrink-0 font-semibold tabular-nums">
            {item.available ? formatMoney(item.lineTotal, currency) : "—"}
          </p>
        </div>
        {variant && (
          <p className="text-sm text-muted-foreground tabular-nums">
            {formatMoney(variant.price, currency)} each
            {variant.salePrice !== null && (
              <s className="ml-2">{formatMoney(variant.listPrice, currency)}</s>
            )}
          </p>
        )}
        {item.problem && (
          <p className="text-sm text-destructive">{item.problem}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {variant ? (
            <fieldset
              aria-label={`Quantity of ${name}`}
              className="flex items-center rounded-lg border"
            >
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="One less"
                disabled={pending || item.quantity <= 1}
                onClick={() => setQuantity(item.quantity - 1)}
              >
                <Minus />
              </Button>
              <span className="w-8 text-center text-sm tabular-nums">
                {item.quantity}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="One more"
                disabled={pending || item.quantity >= max}
                onClick={() => setQuantity(item.quantity + 1)}
              >
                <Plus />
              </Button>
            </fieldset>
          ) : (
            <span />
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => run(() => removeFromCart(item.variantId))}
          >
            <Trash2 /> Remove
          </Button>
        </div>
      </div>
    </li>
  );
}
