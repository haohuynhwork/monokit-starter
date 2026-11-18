import { Button } from "@packages/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { useCartCount } from "@/lib/site/shop-client";

// The header's cart icon with how many units are in the cart; follows
// changes right away
export function CartLink() {
  const count = useCartCount();
  const label = count ? `Cart, ${count} item${count > 1 ? "s" : ""}` : "Cart";
  return (
    <Button variant="ghost" size="icon-sm" className="relative" asChild>
      <Link to="/shop/cart" aria-label={label} title={label}>
        <ShoppingCart />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}
