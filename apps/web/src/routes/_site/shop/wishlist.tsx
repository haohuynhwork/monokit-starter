import { Button } from "@packages/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/shop/product-card";
import { fetchShopCurrency } from "@/lib/shop";
import { loadWishlist } from "@/lib/site/shop-client";

// Signed in: the saved list; signed out: the one on this device, which
// joins the account at login. Browser only: it reads the session and local
// storage.
export const Route = createFileRoute("/_site/shop/wishlist")({
  ssr: false,
  loader: async () => {
    const [state, currency] = await Promise.all([
      loadWishlist(),
      fetchShopCurrency(),
    ]);
    return {
      ...state,
      currency,
    };
  },
  head: () => ({
    meta: [
      {
        title: "Wishlist",
      },
    ],
  }),
  pendingComponent: () => (
    <Frame>
      <div className="h-64 animate-pulse rounded-lg bg-muted/40" />
    </Frame>
  ),
  component: WishlistPage,
});

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Wishlist</h1>
      {children}
    </main>
  );
}

function WishlistPage() {
  const { products, guest, message, currency } = Route.useLoaderData();
  if (message) {
    return (
      <Frame>
        <p className="text-sm text-destructive">{message}</p>
      </Frame>
    );
  }
  if (products.length === 0) {
    return (
      <Frame>
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-8 text-center text-sm">
          <Heart className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            Nothing saved yet. Tap the heart on a product to keep it here.
          </p>
          <Button asChild>
            <Link to="/shop/products">Browse products</Link>
          </Button>
        </div>
      </Frame>
    );
  }
  return (
    <Frame>
      {guest && (
        <p className="mb-4 text-sm text-muted-foreground">
          Saved on this device.{" "}
          <Link
            to="/auth/login"
            search={
              {
                redirect: "/shop/wishlist",
              } as never
            }
            className="underline"
          >
            Log in
          </Link>{" "}
          to keep it with your account.
        </p>
      )}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {products.map((p) => (
          <li key={p.id} className="flex">
            <ProductCard product={p} currency={currency} />
          </li>
        ))}
      </ul>
    </Frame>
  );
}
