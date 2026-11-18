import { Button } from "@packages/ui/components/button";
import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useWishlistIds } from "@/lib/site/shop-client";

// The header's wishlist icon with how many products are saved; follows the
// hearts right away
export function WishlistLink() {
  const count = useWishlistIds()?.size ?? 0;
  const label = count
    ? `Wishlist, ${count} product${count > 1 ? "s" : ""}`
    : "Wishlist";
  return (
    <Button variant="ghost" size="icon-sm" className="relative" asChild>
      <Link to="/shop/wishlist" aria-label={label} title={label}>
        <Heart />
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
