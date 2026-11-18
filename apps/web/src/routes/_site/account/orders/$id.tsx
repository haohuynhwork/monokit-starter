import { Badge } from "@packages/ui/components/badge";
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
import { BillingDetails } from "@/components/shop/billing-details";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import type { Order } from "@/lib/types";
import { CancelButton } from "@/routes/_site/account/-lib/cancel-button";
import { Loading } from "@/routes/_site/account/-lib/heading";
import {
  METHOD_LABEL,
  PAYMENT_LABEL,
  STATUS_LABEL,
} from "@/routes/admin/_auth/orders/-lib/status";

export const Route = createFileRoute("/_site/account/orders/$id")({
  loader: async ({ params }) => {
    if (!/^[1-9]\d*$/.test(params.id)) {
      throw notFound();
    }
    const res = await api<Order>(`/me/orders/${params.id}`);
    if (res.status !== "success" || !res.data) {
      throw notFound();
    }
    return {
      order: res.data,
    };
  },
  pendingComponent: Loading,
  head: ({ params }) => ({
    meta: [
      {
        title: `Order #${params.id}`,
      },
    ],
  }),
  component: MyOrderPage,
});

function MyOrderPage() {
  const { order } = Route.useLoaderData();
  const money = (minor: string) => formatMoney(minor, order.currency);
  const a = order.shippingAddress;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          to="/account/orders"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← My orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Order #{order.id}
          </h1>
          <Badge variant="secondary">{STATUS_LABEL[order.status]}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Placed{" "}
          {new Date(order.createdAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}{" "}
          · {METHOD_LABEL[order.paymentMethod]} (
          {PAYMENT_LABEL[order.paymentStatus]})
        </p>
        {order.trackingNumber && (
          <p className="mt-1 text-sm">Tracking: {order.trackingNumber}</p>
        )}
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Item</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="pr-4 text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item, i) => (
              // Items have no id; the order's lines never change
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed list
              <TableRow key={i}>
                <TableCell className="pl-4">
                  {item.name}
                  {item.variantName && (
                    <span className="block text-xs text-muted-foreground">
                      {item.variantName}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {money(item.unitPrice)}
                  {item.listPrice !== item.unitPrice && (
                    <s className="ml-1 text-muted-foreground">
                      {money(item.listPrice)}
                    </s>
                  )}
                </TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="pr-4 text-right">
                  {money(item.lineTotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-transparent">
            <Total label="Subtotal" value={money(order.subtotal)} />
            <Total label="Shipping" value={money(order.shippingFee)} />
            <Total label="Tax" value={money(order.tax)} />
            <Total label="Total" value={money(order.total)} strong />
          </TableFooter>
        </Table>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ship to</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{a.recipientName}</p>
            <p>{a.phone}</p>
            <p>{a.line1}</p>
            {a.line2 && <p>{a.line2}</p>}
            <p>
              {[
                a.city,
                a.region,
                a.postalCode,
                a.countryCode,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            {order.note && (
              <p className="mt-3 text-muted-foreground">Note: {order.note}</p>
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
      </div>

      {order.status === "pending" && <CancelButton id={order.id} />}
    </div>
  );
}

function Total({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <TableRow
      className={
        strong
          ? "font-semibold hover:bg-transparent"
          : "font-normal text-muted-foreground hover:bg-transparent"
      }
    >
      <TableCell colSpan={3} className="text-right">
        {label}
      </TableCell>
      <TableCell className="pr-4 text-right">{value}</TableCell>
    </TableRow>
  );
}
