import { Button } from "@packages/ui/components/button";
import { cn } from "@packages/ui/lib/utils";
import { Heart } from "lucide-react";
import { notify } from "@/components/toast";
import { setWishlisted, useWishlistIds } from "@/lib/site/shop-client";

// A heart that saves or unsaves the product; `label` adds text next to it
export function WishlistButton({
  productId,
  label = false,
  className,
}: {
  productId: string;
  label?: boolean;
  className?: string;
}) {
  const ids = useWishlistIds();
  const saved = ids?.has(productId) ?? false;
  const text = saved ? "Saved to wishlist" : "Save to wishlist";
  return (
    <Button
      type="button"
      variant={label ? "outline" : "secondary"}
      size={label ? "default" : "icon-sm"}
      aria-label={label ? undefined : text}
      aria-pressed={saved}
      title={text}
      className={cn(!label && "rounded-full shadow-sm", className)}
      onClick={async (e) => {
        e.preventDefault();
        const res = await setWishlisted(productId, !saved);
        if (!res.ok) {
          notify("Couldn't update your wishlist", {
            kind: "error",
            description: res.message,
          });
        }
      }}
    >
      <Heart className={cn(saved && "fill-red-500 text-red-500")} aria-hidden />
      {label && (saved ? "Saved" : "Save")}
    </Button>
  );
}
