import { Button } from "@packages/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import { Input } from "@packages/ui/components/input";
import { useRouter } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { notify } from "@/components/toast";
import type { ShopActionState } from "@/lib/shop";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { changeOrderStatus, changePaymentStatus } from "./actions";
import {
  NEXT_PAYMENT,
  NEXT_STATUS,
  PAYMENT_LABEL,
  STATUS_LABEL,
} from "./status";

const VERB: Record<OrderStatus, string> = {
  pending: "Back to pending",
  processing: "Start processing",
  shipped: "Mark shipped",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
};

const PAYMENT_VERB: Record<PaymentStatus, string> = {
  unpaid: "Mark unpaid",
  paid: "Mark paid",
  refunded: "Mark refunded",
};

// Only the moves the order's rules allow (the api checks them again)
export function OrderControls({
  id,
  status,
  paymentStatus,
  trackingNumber,
}: {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  trackingNumber: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [tracking, setTracking] = useState(trackingNumber ?? "");
  const next = NEXT_STATUS[status];
  const nextPayment = NEXT_PAYMENT[paymentStatus];

  const run = (action: () => Promise<ShopActionState>, title: string) =>
    startTransition(async () => {
      const res = await action();
      notify(res.ok ? title : "Couldn't update the order", {
        kind: res.ok ? "success" : "error",
        description: res.ok ? undefined : res.message,
      });
      if (res.ok) {
        await router.invalidate();
      }
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">
            Status: {STATUS_LABEL[status]}
          </span>
          {next.includes("shipped") && (
            <Input
              aria-label="Tracking number"
              placeholder="Tracking number (optional)"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
            />
          )}
          {next.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              No further status changes.
            </span>
          ) : (
            next.map((to) => (
              <Button
                key={to}
                size="sm"
                variant={to === "cancelled" ? "destructive" : "default"}
                disabled={pending}
                onClick={() => {
                  if (
                    to === "cancelled" &&
                    !confirm("Cancel this order? Stock is put back.")
                  ) {
                    return;
                  }
                  run(
                    () => changeOrderStatus(id, to, tracking),
                    `Order ${STATUS_LABEL[to].toLowerCase()}`,
                  );
                }}
              >
                {VERB[to]}
              </Button>
            ))
          )}
        </div>
        <div className="flex flex-col gap-2 border-t pt-4">
          <span className="text-sm text-muted-foreground">
            Payment: {PAYMENT_LABEL[paymentStatus]}
          </span>
          {nextPayment.map((to) => (
            <Button
              key={to}
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(
                  () => changePaymentStatus(id, to),
                  `Payment ${PAYMENT_LABEL[to].toLowerCase()}`,
                )
              }
            >
              {PAYMENT_VERB[to]}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
