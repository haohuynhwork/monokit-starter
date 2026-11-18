import type { AddressFields } from "./address.js";
import { effectivePrice } from "./product.js";
import {
  InvalidOrderTransitionError,
  InvalidShopInputError,
  OutOfStockError,
  ProductUnavailableError,
} from "./shop.errors.js";

// Rules from ideas/orders/orders.md

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "rejected";
export type PaymentMethod = "cod" | "bank_transfer";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

// Allowed next statuses. Cancelling is only possible before shipping.
const NEXT: Record<OrderStatus, OrderStatus[]> = {
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
  // Rejecting (from pending, with a reason) isn't wired up yet
  rejected: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT[from].includes(to);
}

export interface Fees {
  currency: string;
  taxRateBps: number;
  flatFee: number;
  freeOver: number | null;
}

export interface Totals {
  subtotal: bigint;
  shippingFee: bigint;
  tax: bigint;
  total: bigint;
}

// Shipping: the flat fee, free once the subtotal reaches freeOver.
// Tax: subtotal * bps / 10000, rounded half up.
export function computeTotals(subtotal: bigint, fees: Fees): Totals {
  const shippingFee =
    fees.freeOver !== null && subtotal >= BigInt(fees.freeOver)
      ? 0n
      : BigInt(fees.flatFee);
  const tax = (subtotal * BigInt(fees.taxRateBps) + 5000n) / 10000n;
  return {
    subtotal,
    shippingFee,
    tax,
    total: subtotal + shippingFee + tax,
  };
}

export interface OrderItem {
  productId: bigint | null;
  variantId: bigint | null;
  name: string;
  // Option values at checkout, e.g. "M / Red"; '' without options
  variantName: string;
  sku: string | null;
  // Regular price at checkout, and what was charged per unit
  listPrice: bigint;
  unitPrice: bigint;
  quantity: number;
}

// What checkout knows about a variant and its product, read under a row
// lock on the variant
export interface ProductForSale {
  variantId: bigint;
  productId: bigint;
  name: string;
  variantName: string;
  sku: string | null;
  listPrice: bigint;
  salePrice: bigint | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  trackStock: boolean;
  stock: number;
  status: "draft" | "active" | "archived";
}

export interface OrderEventDraft {
  type: "placed" | "status_changed" | "payment_changed";
  data: Record<string, string | null>;
  actorId: bigint | null;
}

// Who pays, for the invoice (ideas/orders/orders.md "Billing")
export interface BillingDetails extends AddressFields {
  // Company name and tax code (e.g. Vietnam's MST) for a company invoice
  company: string | null;
  taxCode: string | null;
}

const TAX_CODE = /^[A-Za-z0-9][A-Za-z0-9 ./-]{0,31}$/;

// The billing details of a new order. `address` null: the same as
// shipping. Null when that adds nothing (same address, no company), so
// orders only store billing that differs.
export function billingDetails(input: {
  address: AddressFields | null;
  shipping: AddressFields;
  company: string | null;
  taxCode: string | null;
}): BillingDetails | null {
  const company = input.company?.trim() || null;
  const taxCode = input.taxCode?.trim() || null;
  if (company && company.length > 255) {
    throw new InvalidShopInputError(
      "The company name is at most 255 characters",
    );
  }
  if (taxCode && !TAX_CODE.test(taxCode)) {
    throw new InvalidShopInputError(
      "The tax code is up to 32 letters, digits, dots, dashes or slashes",
    );
  }
  if (!input.address && !company && !taxCode) {
    return null;
  }
  return {
    ...(input.address ?? input.shipping),
    company,
    taxCode,
  };
}

export interface OrderProps extends Totals {
  id: bigint | null;
  userId: bigint | null;
  status: OrderStatus;
  currency: string;
  shippingAddress: AddressFields;
  billingAddress: BillingDetails | null;
  trackingNumber: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  note: string | null;
  items: OrderItem[];
}

const MAX_LINES = 100;
const MAX_QUANTITY = 1000;

export class Order {
  // Changes for the repository's save: new timeline rows, and whether the
  // items' stock goes back (cancelled)
  private pendingEvents: OrderEventDraft[] = [];
  private restockPending = false;
  // The status it was loaded with; save refuses if it changed meanwhile
  readonly loadedStatus: OrderStatus | null;

  private constructor(private props: OrderProps) {
    this.loadedStatus = props.id === null ? null : props.status;
  }

  // Checkout. `products` were loaded (and locked) for the requested
  // variant ids; prices come from them, never from the request.
  static place(input: {
    userId: bigint;
    lines: {
      variantId: bigint;
      quantity: number;
    }[];
    products: ProductForSale[];
    address: AddressFields;
    billing: BillingDetails | null;
    paymentMethod: PaymentMethod;
    note: string | null;
    fees: Fees;
    now: Date;
  }): Order {
    const lines = mergeLines(input.lines);
    const byId = new Map(
      input.products.map((p) => [
        p.variantId,
        p,
      ]),
    );
    const items: OrderItem[] = lines.map(({ variantId, quantity }) => {
      const p = byId.get(variantId);
      const label =
        p && (p.variantName ? `${p.name} (${p.variantName})` : p.name);
      if (!p || p.status !== "active") {
        throw new ProductUnavailableError(
          `${label ?? `Variant ${variantId}`} is not for sale`,
        );
      }
      if (p.trackStock && p.stock < quantity) {
        throw new OutOfStockError(`Only ${p.stock} of ${label} left in stock`);
      }
      return {
        productId: p.productId,
        variantId,
        name: p.name,
        variantName: p.variantName,
        sku: p.sku,
        listPrice: p.listPrice,
        unitPrice: effectivePrice(p, input.now),
        quantity,
      };
    });
    const subtotal = items.reduce(
      (sum, i) => sum + i.unitPrice * BigInt(i.quantity),
      0n,
    );
    const note = input.note?.trim() || null;
    if (note && note.length > 1000) {
      throw new InvalidShopInputError("The note is at most 1000 characters");
    }
    const order = new Order({
      id: null,
      userId: input.userId,
      status: "pending",
      currency: input.fees.currency,
      ...computeTotals(subtotal, input.fees),
      shippingAddress: input.address,
      billingAddress: input.billing,
      trackingNumber: null,
      paymentMethod: input.paymentMethod,
      paymentStatus: "unpaid",
      paidAt: null,
      note,
      items,
    });
    order.pendingEvents.push({
      type: "placed",
      data: {},
      actorId: input.userId,
    });
    return order;
  }

  static restore(props: OrderProps): Order {
    return new Order(props);
  }

  get id(): bigint | null {
    return this.props.id;
  }
  get userId(): bigint | null {
    return this.props.userId;
  }
  get status(): OrderStatus {
    return this.props.status;
  }
  get items(): readonly OrderItem[] {
    return this.props.items;
  }

  // Staff move it along; tracking may be set when shipping
  changeStatus(
    to: OrderStatus,
    actorId: bigint,
    trackingNumber?: string | null,
  ): void {
    const from = this.props.status;
    if (!canTransition(from, to)) {
      throw new InvalidOrderTransitionError(
        `An order that is ${from} cannot become ${to}`,
      );
    }
    this.props.status = to;
    if (to === "shipped" && trackingNumber !== undefined) {
      this.props.trackingNumber = trackingNumber?.trim() || null;
    }
    if (to === "cancelled") {
      this.restockPending = true;
    }
    this.pendingEvents.push({
      type: "status_changed",
      data: {
        from,
        to,
      },
      actorId,
    });
  }

  // The customer may cancel only while it's pending
  cancelByCustomer(userId: bigint): void {
    if (this.props.status !== "pending") {
      throw new InvalidOrderTransitionError(
        "Only pending orders can be cancelled; contact the shop",
      );
    }
    this.changeStatus("cancelled", userId);
  }

  changePayment(to: PaymentStatus, actorId: bigint, now: Date): void {
    const from = this.props.paymentStatus;
    const ok =
      (from === "unpaid" && to === "paid") ||
      (from === "paid" && (to === "refunded" || to === "unpaid"));
    if (!ok) {
      throw new InvalidOrderTransitionError(
        `Payment that is ${from} cannot become ${to}`,
      );
    }
    this.props.paymentStatus = to;
    this.props.paidAt = to === "paid" ? now.toISOString() : this.props.paidAt;
    if (to === "unpaid") {
      this.props.paidAt = null;
    }
    this.pendingEvents.push({
      type: "payment_changed",
      data: {
        from,
        to,
      },
      actorId,
    });
  }

  // For the repository
  takeEvents(): OrderEventDraft[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }
  get restock(): boolean {
    return this.restockPending;
  }

  assignId(id: bigint): void {
    this.props.id = id;
  }

  snapshot(): Readonly<OrderProps> {
    return this.props;
  }
}

// Same variant twice adds up; quantities must be whole and positive
function mergeLines(
  lines: {
    variantId: bigint;
    quantity: number;
  }[],
): {
  variantId: bigint;
  quantity: number;
}[] {
  if (lines.length === 0 || lines.length > MAX_LINES) {
    throw new InvalidShopInputError(`An order has 1 to ${MAX_LINES} items`);
  }
  const merged = new Map<bigint, number>();
  for (const { variantId, quantity } of lines) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new InvalidShopInputError(
        "Quantities are whole numbers, 1 or more",
      );
    }
    const total = (merged.get(variantId) ?? 0) + quantity;
    if (total > MAX_QUANTITY) {
      throw new InvalidShopInputError(`At most ${MAX_QUANTITY} of one variant`);
    }
    merged.set(variantId, total);
  }
  return [
    ...merged,
  ].map(([variantId, quantity]) => ({
    variantId,
    quantity,
  }));
}
