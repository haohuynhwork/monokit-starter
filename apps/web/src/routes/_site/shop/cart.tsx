import { Button } from "@packages/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { fetchShopCurrency } from "@/lib/shop";
import { loadCart } from "@/lib/site/shop-client";
import { CartView } from "./cart/-lib/cart-view";

// Signed in: the account's cart. Signed out: the guest cart (local),
// priced by the api; checking out asks to log in, which merges it. Browser
// only: it reads the session and local storage.
export const Route = createFileRoute("/_site/shop/cart")({
  ssr: false,
  loader: async () => {
    const [state, currency] = await Promise.all([
      loadCart(),
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
        title: "Cart",
      },
    ],
  }),
  pendingComponent: () => (
    <Frame>
      <div className="h-64 animate-pulse rounded-lg bg-muted/40" />
    </Frame>
  ),
  component: CartPage,
});

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Cart</h1>
      {children}
    </main>
  );
}

function CartPage() {
  const { cart, guest, message, currency } = Route.useLoaderData();
  if (!cart) {
    return (
      <Frame>
        <p className="text-sm text-destructive">
          {message ?? "Couldn't load your cart."}
        </p>
      </Frame>
    );
  }
  if (cart.items.length === 0) {
    return (
      <Frame>
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-8 text-center text-sm">
          <ShoppingCart className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Button asChild>
            <Link to="/shop/products">Browse products</Link>
          </Button>
        </div>
      </Frame>
    );
  }
  return (
    <Frame>
      <CartView items={cart.items} currency={currency} guest={guest} />
    </Frame>
  );
}
