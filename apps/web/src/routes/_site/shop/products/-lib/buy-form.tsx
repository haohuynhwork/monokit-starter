import { Button } from "@packages/ui/components/button";
import { Input } from "@packages/ui/components/input";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { currentUser } from "@/lib/site/shop-client";
import { useSelection } from "./variant-picker";

// The variant chosen in the picker (VariantProvider): add it to the cart,
// or "Buy now", which opens /checkout for just that variant. Signed out,
// the guest cart works; buying now needs an account, so it goes to log in
// and comes back to this product.
export function BuyForm({ slug }: { slug: string }) {
  const { variant } = useSelection();
  const buyable = !!variant?.inStock;
  const id = useId();
  const navigate = useNavigate();
  const quantityRef = useRef<HTMLInputElement>(null);
  // undefined until the session is known
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void currentUser().then((u) => {
      if (live) {
        setSignedIn(!!u);
      }
    });
    return () => {
      live = false;
    };
  }, []);
  const quantity = () => Math.max(1, Number(quantityRef.current?.value) || 1);

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (variant) {
          void navigate({
            to: "/shop/checkout",
            search: {
              product: slug,
              variant: variant.id,
              qty: quantity(),
            },
          });
        }
      }}
    >
      <label
        htmlFor={`${id}-quantity`}
        className="flex items-center gap-3 text-sm"
      >
        Quantity
        <Input
          ref={quantityRef}
          id={`${id}-quantity`}
          type="number"
          name="qty"
          defaultValue={1}
          min={1}
          // Tracked stock caps it (null: not tracked)
          max={variant?.stock ?? undefined}
          className="w-24"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <AddToCartButton
          variantId={variant?.id ?? null}
          disabled={!buyable}
          quantity={quantity}
        />
        {signedIn === false ? (
          <Button variant="outline" asChild>
            <Link
              to="/auth/login"
              search={
                {
                  redirect: `/shop/products/${slug}`,
                } as never
              }
            >
              Log in to buy now
            </Link>
          </Button>
        ) : (
          <Button
            type="submit"
            variant="outline"
            disabled={!buyable || signedIn === undefined}
          >
            {buyable
              ? "Buy now"
              : variant
                ? "Out of stock"
                : "Choose another option"}
          </Button>
        )}
      </div>
    </form>
  );
}
