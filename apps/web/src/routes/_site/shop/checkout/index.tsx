import { Button } from "@packages/ui/components/button";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { idParam, intParam, textParam } from "@/lib/search";
import { fetchShippingCountries, fetchShopCurrency } from "@/lib/shop";
import { getShopProduct } from "@/lib/site/public-shop";
import { currentUser } from "@/lib/site/shop-client";
import type { Cart, SavedAddress } from "@/lib/types";
import { CheckoutForm } from "./-lib/checkout-form";

type CheckoutSearch = {
  // "Buy now": that product's variant and quantity
  product?: string;
  variant?: string;
  qty?: number;
  // The cart lines ticked on the cart page (variant ids, comma separated)
  items?: string;
};

type Line = {
  key: string;
  name: string;
  variantName: string;
  imageUrl: string | null;
  quantity: number;
  // Per unit and for the line, minor units
  price: string;
  lineTotal: string;
};

type Prepared =
  | {
      kind: "missing";
      message: string;
    }
  | {
      kind: "ready";
      lines: Line[];
      buyNow?: {
        variantId: string;
        quantity: number;
      };
      cartItems?: string[];
      problem: string | null;
    };

// "Buy now" links here with ?product=<slug>&variant=<id>&qty=<n> for that
// one variant; the cart with ?items=<variantId>,... for the lines ticked
// there (without it, every available line). Signed out goes to /login and
// comes back. Browser only: it reads the session.
export const Route = createFileRoute("/_site/shop/checkout/")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): CheckoutSearch => ({
    product: textParam(s.product),
    variant: idParam(s.variant),
    qty: intParam(s.qty),
    items: textParam(s.items),
  }),
  beforeLoad: async ({ location }) => {
    if (!(await currentUser())) {
      throw redirect({
        to: "/auth/login",
        search: {
          redirect: location.href,
        } as never,
      });
    }
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [addresses, currency, allowedCountries] = await Promise.all([
      api<SavedAddress[]>("/me/addresses", {
        silent: true,
      }),
      fetchShopCurrency(),
      fetchShippingCountries(),
    ]);
    return {
      addresses:
        addresses.status === "success" && addresses.data ? addresses.data : [],
      currency,
      allowedCountries,
      prepared: await prepare(deps),
    };
  },
  head: () => ({
    meta: [
      {
        title: "Checkout",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),
  pendingComponent: () => (
    <Frame>
      <div className="h-64 animate-pulse rounded-lg bg-muted/40" />
    </Frame>
  ),
  component: CheckoutPage,
});

async function prepare(search: CheckoutSearch): Promise<Prepared> {
  const quantity = Math.max(1, search.qty ?? 1);
  if (search.product && search.variant) {
    const product = await getShopProduct({
      data: search.product,
    });
    const variant = product?.variants.find((v) => v.id === search.variant);
    if (!product || !variant) {
      return {
        kind: "missing",
        message: "That product isn't available any more.",
      };
    }
    let problem: string | null = null;
    if (!variant.inStock) {
      problem = "Out of stock.";
    } else if (variant.stock !== null && quantity > variant.stock) {
      problem = `Only ${variant.stock} left in stock.`;
    }
    return {
      kind: "ready",
      problem,
      buyNow: {
        variantId: variant.id,
        quantity,
      },
      lines: [
        {
          key: variant.id,
          name: product.name,
          variantName: variant.name,
          imageUrl: variant.imageUrl ?? product.cover?.url ?? null,
          quantity,
          price: variant.price,
          lineTotal: String(BigInt(variant.price) * BigInt(quantity)),
        },
      ],
    };
  }
  const picked = (search.items ?? "").split(",").filter(Boolean);
  const cart = await api<Cart>("/me/cart", {
    silent: true,
  });
  if (cart.status !== "success" || !cart.data) {
    return {
      kind: "missing",
      message: cart.message ?? "Couldn't load your cart.",
    };
  }
  const available = cart.data.items.filter(
    (i) => i.available && (picked.length === 0 || picked.includes(i.variantId)),
  );
  if (available.length === 0) {
    return {
      kind: "missing",
      message: "None of these items can be ordered right now.",
    };
  }
  return {
    kind: "ready",
    problem:
      picked.length > available.length
        ? "Some items you picked can't be ordered now; they stay in your cart."
        : null,
    cartItems: available.map((i) => i.variantId),
    lines: available.map((i) => ({
      key: i.variantId,
      name: i.product?.name ?? "",
      variantName: i.variant?.name ?? "",
      imageUrl: i.variant?.imageUrl ?? null,
      quantity: i.quantity,
      price: i.variant?.price ?? "0",
      lineTotal: i.lineTotal,
    })),
  };
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Checkout</h1>
      {children}
    </main>
  );
}

function CheckoutPage() {
  const { addresses, currency, allowedCountries, prepared } =
    Route.useLoaderData();
  if (prepared.kind === "missing") {
    return (
      <Frame>
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">{prepared.message}</p>
          <Button asChild>
            <Link to="/shop/products">Browse products</Link>
          </Button>
        </div>
      </Frame>
    );
  }
  const { lines, buyNow, cartItems, problem } = prepared;
  const subtotal = lines.reduce((n, l) => n + BigInt(l.lineTotal), BigInt(0));
  const money = (minor: string | bigint) =>
    formatMoney(String(minor), currency);

  return (
    <Frame>
      <div className="grid gap-10 md:grid-cols-[1fr_22rem]">
        <section aria-label="Delivery and payment">
          <CheckoutForm
            addresses={addresses}
            allowedCountries={allowedCountries}
            buyNow={buyNow}
            cartItems={cartItems}
            disabled={!!buyNow && !!problem}
          />
        </section>
        <aside className="order-first flex h-fit flex-col gap-4 rounded-lg border p-4 md:sticky md:top-20 md:order-none">
          <h2 className="font-semibold">Order summary</h2>
          <ul className="flex flex-col gap-3">
            {lines.map((l) => (
              <li key={l.key} className="flex gap-3 text-sm">
                {l.imageUrl ? (
                  <img
                    src={l.imageUrl}
                    alt=""
                    className="size-14 shrink-0 rounded-md border object-cover"
                  />
                ) : (
                  <div className="size-14 shrink-0 rounded-md border bg-muted/40" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{l.name}</p>
                  {l.variantName && (
                    <p className="text-muted-foreground">{l.variantName}</p>
                  )}
                  <p className="text-muted-foreground">
                    {l.quantity} × {money(l.price)}
                  </p>
                </div>
                <p className="font-medium">{money(l.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <dl className="flex items-baseline justify-between border-t pt-3">
            <dt className="text-sm text-muted-foreground">Subtotal</dt>
            <dd className="text-xl font-semibold">{money(subtotal)}</dd>
          </dl>
          <p className="text-xs text-muted-foreground">
            Shipping and tax are added when the order is placed.
          </p>
          {problem && (
            <p role="alert" className="text-sm text-destructive">
              {problem}
            </p>
          )}
          {!buyNow && (
            <Link to="/shop/cart" className="text-sm underline">
              Edit cart
            </Link>
          )}
        </aside>
      </div>
    </Frame>
  );
}
