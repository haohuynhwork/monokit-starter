import type { OrderStatus, PaymentStatus } from "@/lib/types";

// Mirrors the api's rules (shop/domain/order.ts); the api enforces them
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending: [
    "processing",
    "cancelled",
  ],
  processing: [
    "shipped",
    "cancelled",
  ],
  shipped: [
    "delivered",
  ],
  delivered: [],
  cancelled: [],
};

export const NEXT_PAYMENT: Record<PaymentStatus, PaymentStatus[]> = {
  unpaid: [
    "paid",
  ],
  paid: [
    "refunded",
    "unpaid",
  ],
  refunded: [],
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  refunded: "Refunded",
};

export const METHOD_LABEL = {
  cod: "Cash on delivery",
  bank_transfer: "Bank transfer",
} as const;
