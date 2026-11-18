import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@packages/ui/components/table";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { NotStaff } from "@/components/pager";
import { BillingDetails } from "@/components/shop/billing-details";
import { api } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import type { Order } from "@/lib/types";
import {
  OrderStatusBadge,
  PaymentBadge,
} from "@/routes/admin/_auth/orders/-lib/badges";
import { OrderControls } from "@/routes/admin/_auth/orders/-lib/order-controls";
import {
  METHOD_LABEL,
  PAYMENT_LABEL,
  STATUS_LABEL,
} from "@/routes/admin/_auth/orders/-lib/status";

export const Route = createFileRoute("/admin/_auth/orders/$id")({
  loader: async ({ context, params }) => {
    if (!isStaff(context.user)) {
      return {
        notStaff: true as const,
      };
    }
    if (!/^[1-9]\d*$/.test(params.id)) {
      throw notFound();
    }
    const res = await api<Order>(`/orders/${params.id}`);
    if (res.status !== "success" || !res.data) {
      throw notFound();
    }
    return {
      notStaff: false as const,
      order: res.data,
    };
  },
  pendingComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">Loading…</p>
    </Shell>
  ),
  component: OrderPage,
});

function OrderPage() {
  const data = Route.useLoaderData();
  return (
    <Shell>
      {data.notStaff ? <NotStaff /> : <Loaded order={data.order} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/admin/orders"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Orders
      </Link>
      {children}
    </div>
  );
}

function Loaded({ order }: { order: Order }) {
  const money = (v: string) => formatMoney(v, order.currency);
  const a = order.shippingAddress;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Order #{order.id}
        </h1>
        <OrderStatusBadge status={order.status} />
        <PaymentBadge status={order.paymentStatus} />
        <span className="text-sm text-muted-foreground">
          Placed {new Date(order.createdAt).toLocaleString()}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, i) => (
                  <TableRow key={`${item.productId ?? "x"}-${i}`}>
                    <TableCell>
                      {item.productId ? (
                        <Link
                          to="/admin/products/$id"
                          params={{
                            id: item.productId,
                          }}
                          className="font-medium hover:underline"
                        >
                          {item.name}
                        </Link>
                      ) : (
                        <span className="font-medium">{item.name}</span>
                      )}
                      {(item.variantName || item.sku) && (
                        <div className="text-xs text-muted-foreground">
                          {[
                            item.variantName,
                            item.sku,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.listPrice !== item.unitPrice && (
                        <s className="mr-1.5 text-xs text-muted-foreground">
                          {money(item.listPrice)}
                        </s>
                      )}
                      {money(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(item.lineTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <SumRow label="Subtotal" value={money(order.subtotal)} />
                <SumRow label="Shipping" value={money(order.shippingFee)} />
                <SumRow label="Tax" value={money(order.tax)} />
                <SumRow label="Total" value={money(order.total)} strong />
              </TableFooter>
            </Table>
          </div>

          {order.note && (
            <Card>
              <CardHeader>
                <CardTitle>Customer note</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">
                {order.note}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3 border-l pl-4 text-sm">
                {[
                  ...order.events,
                ]
                  .reverse()
                  .map((e, i) => (
                    <li key={`${e.createdAt}-${i}`} className="relative">
                      <span className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-primary" />
                      <div>{describeEvent(e)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.createdAt).toLocaleString()}
                        {e.actorId && ` · user #${e.actorId}`}
                      </div>
                    </li>
                  ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          <OrderControls
            id={order.id}
            status={order.status}
            paymentStatus={order.paymentStatus}
            trackingNumber={order.trackingNumber}
          />
          <Card>
            <CardHeader>
              <CardTitle>Shipping address</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col text-sm">
              <span className="font-medium">{a.recipientName}</span>
              <span>{a.phone}</span>
              <span>{a.line1}</span>
              {a.line2 && <span>{a.line2}</span>}
              <span>
                {[
                  a.city,
                  a.region,
                  a.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
              <span>{a.countryCode}</span>
              {order.trackingNumber && (
                <span className="mt-2 text-muted-foreground">
                  Tracking: {order.trackingNumber}
                </span>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <BillingDetails billing={order.billingAddress} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <span>{METHOD_LABEL[order.paymentMethod]}</span>
              <span className="text-muted-foreground">
                {PAYMENT_LABEL[order.paymentStatus]}
                {order.paidAt &&
                  ` on ${new Date(order.paidAt).toLocaleString()}`}
              </span>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function SumRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <TableRow className={strong ? "font-semibold" : "font-normal"}>
      <TableCell colSpan={3} className="text-right">
        {label}
      </TableCell>
      <TableCell className="text-right tabular-nums">{value}</TableCell>
    </TableRow>
  );
}

function describeEvent(e: Order["events"][number]): string {
  const label = (v?: string) =>
    (v && (STATUS_LABEL as Record<string, string>)[v]) ??
    (v && (PAYMENT_LABEL as Record<string, string>)[v]) ??
    v ??
    "?";
  if (e.type === "placed") {
    return "Order placed";
  }
  if (e.type === "status_changed") {
    return `Status: ${label(e.data.from)} → ${label(e.data.to)}`;
  }
  return `Payment: ${label(e.data.from)} → ${label(e.data.to)}`;
}
