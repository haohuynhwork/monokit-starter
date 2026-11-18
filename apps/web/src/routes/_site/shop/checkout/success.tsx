import { Button } from "@packages/ui/components/button";
import {
  createFileRoute,
  Link,
  notFound,
  redirect,
} from "@tanstack/react-router";
import { CircleCheck } from "lucide-react";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { idParam } from "@/lib/search";
import { currentUser } from "@/lib/site/shop-client";
import type { Order } from "@/lib/types";
import { METHOD_LABEL } from "@/routes/admin/_auth/orders/-lib/status";

// After "Place order": the customer's own order (?order=<id>). Browser only:
// it reads the session.
export const Route = createFileRoute("/_site/shop/checkout/success")({
  ssr: false,
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    order?: string;
  } => ({
    order: idParam(s.order),
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
    if (!deps.order) {
      throw notFound();
    }
    const res = await api<Order>(
      `/me/orders/${encodeURIComponent(deps.order)}`,
      {
        silent: true,
      },
    );
    if (res.status !== "success" || !res.data) {
      throw notFound();
    }
    return res.data;
  },
  head: () => ({
    meta: [
      {
        title: "Thank you",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),
  component: Placed,
});

function Placed() {
  const order = Route.useLoaderData();
  const money = (minor: string) => formatMoney(minor, order.currency);
  const a = order.shippingAddress;
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16">
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <CircleCheck className="size-12 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Thank you for your order
          </h1>
          <p className="text-muted-foreground">
            Order #{order.id} is placed.{" "}
            {order.paymentMethod === "bank_transfer"
              ? "Transfer the total to complete it; we start once it arrives."
              : "Pay the courier when it arrives."}
          </p>
        </div>
        <div className="w-full rounded-lg border p-4 text-left text-sm">
          <ul className="flex flex-col gap-2">
            {order.items.map((item, i) => (
              // Order lines have no id and never change
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed list
              <li key={i} className="flex justify-between gap-4">
                <span>
                  {item.quantity} × {item.name}
                  {item.variantName && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({item.variantName})
                    </span>
                  )}
                </span>
                <span>{money(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1 border-t pt-3">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="text-right">{money(order.subtotal)}</dd>
            <dt className="text-muted-foreground">Shipping</dt>
            <dd className="text-right">{money(order.shippingFee)}</dd>
            {order.tax !== "0" && (
              <>
                <dt className="text-muted-foreground">Tax</dt>
                <dd className="text-right">{money(order.tax)}</dd>
              </>
            )}
            <dt className="font-semibold">Total</dt>
            <dd className="text-right font-semibold">{money(order.total)}</dd>
          </dl>
          <p className="mt-3 border-t pt-3 text-muted-foreground">
            Ship to {a.recipientName}, {a.line1}, {a.city} ·{" "}
            {METHOD_LABEL[order.paymentMethod]}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link
              to="/account/orders/$id"
              params={{
                id: order.id,
              }}
            >
              View order
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/shop/products">Continue shopping</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
