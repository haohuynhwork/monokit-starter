import { call } from "@/lib/admin/call";
import type { ShopActionState } from "@/lib/shop";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

// Callers run `router.invalidate()` after a success

export async function changeOrderStatus(
  id: string,
  status: OrderStatus,
  trackingNumber?: string,
): Promise<ShopActionState> {
  return call(
    `/orders/${id}/status`,
    {
      method: "POST",
      body: {
        status,
        ...(status === "shipped" && {
          trackingNumber: trackingNumber?.trim() || null,
        }),
      },
    },
    `Order ${status}.`,
  );
}

export async function changePaymentStatus(
  id: string,
  paymentStatus: PaymentStatus,
): Promise<ShopActionState> {
  return call(
    `/orders/${id}/payment`,
    {
      method: "POST",
      body: {
        paymentStatus,
      },
    },
    `Payment marked ${paymentStatus}.`,
  );
}
