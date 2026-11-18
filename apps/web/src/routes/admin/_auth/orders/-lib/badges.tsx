import { Badge } from "@packages/ui/components/badge";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { PAYMENT_LABEL, STATUS_LABEL } from "./status";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const variant =
    status === "delivered"
      ? "default"
      : status === "cancelled"
        ? "outline"
        : "secondary";
  return <Badge variant={variant}>{STATUS_LABEL[status]}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant={status === "paid" ? "default" : "outline"}>
      {PAYMENT_LABEL[status]}
    </Badge>
  );
}
