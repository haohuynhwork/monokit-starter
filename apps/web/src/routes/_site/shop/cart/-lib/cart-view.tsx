import { Button } from "@packages/ui/components/button";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { formatMoney } from "@/lib/money";
import type { CartLine } from "@/lib/types";
import { CartLines } from "./cart-lines";

// Lines plus the summary: the customer ticks what to pay for now (all
// available lines at first); "Checkout" takes those to /checkout, the rest
// stays in the cart
export function CartView({
  items,
  currency,
  guest = false,
}: {
  items: CartLine[];
  currency: string;
  // Signed out: log in (or sign up) to check out, back to /cart after
  guest?: boolean;
}) {
  const available = items.filter((i) => i.available);
  // Unticked lines, so lines added later (or that become available) start
  // ticked
  const [unticked, setUnticked] = useState<Set<string>>(() => new Set());
  const chosen = available.filter((i) => !unticked.has(i.variantId));
  const selected = new Set(chosen.map((i) => i.variantId));
  const subtotal = chosen.reduce((n, i) => n + BigInt(i.lineTotal), BigInt(0));
  const units = chosen.reduce((n, i) => n + i.quantity, 0);
  const all = chosen.length === available.length;

  const select = (variantId: string, on: boolean) =>
    setUnticked((prev) => {
      const next = new Set(prev);
      if (on) {
        next.delete(variantId);
      } else {
        next.add(variantId);
      }
      return next;
    });

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-2">
        {available.length > 1 && (
          <label className="flex items-center gap-3 px-4 text-sm">
            <input
              type="checkbox"
              checked={all}
              onChange={() =>
                setUnticked(
                  all ? new Set(available.map((i) => i.variantId)) : new Set(),
                )
              }
              className="size-4 accent-primary"
            />
            Select all ({available.length})
          </label>
        )}
        <CartLines
          items={items}
          currency={currency}
          selected={selected}
          onSelect={select}
        />
      </div>
      <aside className="flex h-fit flex-col gap-4 rounded-lg border p-4 md:sticky md:top-20">
        <dl className="flex items-baseline justify-between">
          <dt className="text-sm text-muted-foreground">
            Subtotal ({units} {units === 1 ? "item" : "items"})
          </dt>
          <dd className="text-xl font-semibold">
            {formatMoney(String(subtotal), currency)}
          </dd>
        </dl>
        <p className="text-xs text-muted-foreground">
          Shipping and tax are added when the order is placed. Unticked items
          stay in the cart.
        </p>
        {guest ? (
          <>
            <Button asChild size="lg">
              <Link
                to="/auth/login"
                search={
                  {
                    redirect: "/shop/cart",
                  } as never
                }
              >
                Log in to check out
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link
                to="/auth/register"
                search={
                  {
                    redirect: "/shop/cart",
                  } as never
                }
              >
                Create an account
              </Link>
            </Button>
          </>
        ) : chosen.length > 0 ? (
          <Button asChild size="lg">
            <Link
              to="/shop/checkout"
              search={{
                items: chosen.map((i) => i.variantId).join(","),
              }}
            >
              Checkout
            </Link>
          </Button>
        ) : (
          <Button size="lg" disabled>
            {available.length ? "Tick items to check out" : "Checkout"}
          </Button>
        )}
      </aside>
    </div>
  );
}
