import { Button } from "@packages/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@packages/ui/components/table";
import { Link, useRouter } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { EmptyRow, type EmptyText } from "@/components/empty-row";
import { notify } from "@/components/toast";
import { formatMoney } from "@/lib/money";
import type { ShopActionState } from "@/lib/shop";
import type { OrderSummary } from "@/lib/types";
import { changeOrderStatus, changePaymentStatus } from "./actions";
import { OrderStatusBadge, PaymentBadge } from "./badges";
import { NEXT_PAYMENT, NEXT_STATUS } from "./status";

// `allowed` mirrors the api's rules, so orders that can't take the step are
// skipped instead of sent to fail
const BULK = {
  processing: {
    label: "Processing",
    allowed: (o: OrderSummary) => NEXT_STATUS[o.status].includes("processing"),
    run: (id: string) => changeOrderStatus(id, "processing"),
  },
  shipped: {
    label: "Shipped",
    allowed: (o: OrderSummary) => NEXT_STATUS[o.status].includes("shipped"),
    run: (id: string) => changeOrderStatus(id, "shipped"),
  },
  delivered: {
    label: "Delivered",
    allowed: (o: OrderSummary) => NEXT_STATUS[o.status].includes("delivered"),
    run: (id: string) => changeOrderStatus(id, "delivered"),
  },
  paid: {
    label: "Mark paid",
    allowed: (o: OrderSummary) =>
      NEXT_PAYMENT[o.paymentStatus].includes("paid"),
    run: (id: string) => changePaymentStatus(id, "paid"),
  },
  cancelled: {
    label: "Cancel",
    allowed: (o: OrderSummary) => NEXT_STATUS[o.status].includes("cancelled"),
    run: (id: string) => changeOrderStatus(id, "cancelled"),
  },
} satisfies Record<
  string,
  {
    label: string;
    allowed: (o: OrderSummary) => boolean;
    run: (id: string) => Promise<ShopActionState>;
  }
>;

type Kind = keyof typeof BULK;

export function OrdersTable({
  orders,
  empty,
}: {
  orders: OrderSummary[];
  // Shown in the table when there are no orders
  empty: EmptyText;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const allSelected =
    orders.length > 0 && orders.every((o) => selected.has(o.id));
  const chosen = orders.filter((o) => selected.has(o.id));
  const eligible = (kind: Kind) => chosen.filter(BULK[kind].allowed);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  // One by one, so one refusal doesn't stop the rest
  function run(kind: Kind) {
    const targets = eligible(kind);
    const n = targets.length;
    const skipped = chosen.length - n;
    const { label } = BULK[kind];
    const noun = `order${n > 1 ? "s" : ""}`;
    const skipNote = skipped ? ` (${skipped} skipped: not allowed)` : "";
    if (!confirm(`${label}: ${n} ${noun}${skipNote}?`)) {
      return;
    }
    startTransition(async () => {
      const failed: string[] = [];
      for (const o of targets) {
        const res = await BULK[kind].run(o.id);
        if (!res.ok) {
          failed.push(`#${o.id}: ${res.message ?? "failed"}`);
        }
      }
      if (failed.length) {
        notify(`${label}: ${n - failed.length} of ${n} done`, {
          kind: "error",
          description: failed.join("; "),
        });
      } else {
        notify(`${label}: ${n} ${noun} done${skipNote}`, {
          kind: "success",
        });
      }
      setSelected(new Set());
      await router.invalidate();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
        <span
          className={selected.size ? "font-medium" : "text-muted-foreground"}
        >
          {selected.size ? `${selected.size} selected` : "No rows selected"}
        </span>
        <span className="ml-auto text-muted-foreground">Set to</span>
        {(
          [
            "processing",
            "shipped",
            "delivered",
            "paid",
          ] as const
        ).map((kind) => {
          const n = eligible(kind).length;
          return (
            <Button
              key={kind}
              variant="outline"
              size="xs"
              disabled={pending || n === 0}
              onClick={() => run(kind)}
            >
              {BULK[kind].label}
              {n > 0 && n < chosen.length && ` (${n})`}
            </Button>
          );
        })}
        <Button
          variant="destructive"
          size="xs"
          disabled={pending || eligible("cancelled").length === 0}
          onClick={() => run("cancelled")}
        >
          {pending ? "Working…" : "Cancel"}
        </Button>
        <Button
          variant="ghost"
          size="xs"
          disabled={pending || selected.size === 0}
          onClick={() => setSelected(new Set())}
        >
          Clear
        </Button>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allSelected}
                  disabled={orders.length === 0}
                  onChange={() =>
                    setSelected(
                      allSelected
                        ? new Set()
                        : new Set(orders.map((o) => o.id)),
                    )
                  }
                  className="size-4 accent-primary"
                />
              </TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Placed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && <EmptyRow {...empty} colSpan={7} />}
            {orders.map((o) => (
              <TableRow
                key={o.id}
                data-state={selected.has(o.id) ? "selected" : undefined}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    aria-label={`Select order #${o.id}`}
                    checked={selected.has(o.id)}
                    onChange={() => toggle(o.id)}
                    className="size-4 accent-primary"
                  />
                </TableCell>
                <TableCell>
                  <Link
                    to="/admin/orders/$id"
                    params={{
                      id: o.id,
                    }}
                    className="font-medium hover:underline"
                  >
                    #{o.id}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {o.itemCount} item{o.itemCount === 1 ? "" : "s"}
                  </div>
                </TableCell>
                <TableCell>{o.recipientName}</TableCell>
                <TableCell>
                  <OrderStatusBadge status={o.status} />
                </TableCell>
                <TableCell>
                  <PaymentBadge status={o.paymentStatus} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(o.total, o.currency)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(o.createdAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
