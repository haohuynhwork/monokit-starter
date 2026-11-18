import { Button } from "@packages/ui/components/button";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import { notify } from "@/components/toast";
import { addToCart } from "@/lib/site/shop-client";

// Adds a variant to the cart and says so
export function AddToCartButton({
  variantId,
  quantity = 1,
  disabled,
  variant = "default",
  className,
}: {
  variantId: string | null;
  // A number, or read when clicked (e.g. from a quantity field)
  quantity?: number | (() => number);
  disabled?: boolean;
  variant?: "default" | "outline";
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      disabled={pending || disabled || !variantId}
      onClick={async () => {
        if (!variantId) {
          return;
        }
        setPending(true);
        const n = typeof quantity === "function" ? quantity() : quantity;
        const res = await addToCart(variantId, n);
        setPending(false);
        notify(res.ok ? "Added to cart" : "Couldn't add to cart", {
          kind: res.ok ? "success" : "error",
          description: res.ok ? "It's in the cart at the top." : res.message,
        });
      }}
    >
      <ShoppingCart />
      {pending ? "Adding…" : "Add to cart"}
    </Button>
  );
}
