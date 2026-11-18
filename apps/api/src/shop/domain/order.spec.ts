import { describe, expect, it } from "vitest";
import type { AddressFields } from "./address.js";
import {
  billingDetails,
  canTransition,
  computeTotals,
  Order,
  type ProductForSale,
} from "./order.js";
import { effectivePrice, Product } from "./product.js";
import { InvalidShopInputError } from "./shop.errors.js";

const NOW = new Date("2026-11-01T12:00:00Z");

const fees = {
  currency: "USD",
  taxRateBps: 1000,
  flatFee: 500,
  freeOver: 10000,
};
const address: AddressFields = {
  label: null,
  recipientName: "An",
  phone: "1",
  line1: "x",
  line2: null,
  city: "Hanoi",
  regionCode: null,
  region: null,
  postalCode: null,
  countryCode: "VN",
};
const product = (over: Partial<ProductForSale> = {}): ProductForSale => ({
  variantId: 1n,
  productId: 1n,
  name: "Shirt",
  variantName: "",
  sku: null,
  listPrice: 2500n,
  salePrice: null,
  saleStartsAt: null,
  saleEndsAt: null,
  trackStock: true,
  stock: 10,
  status: "active",
  ...over,
});
const place = (products: ProductForSale[], quantity = 2) =>
  Order.place({
    userId: 7n,
    lines: [
      {
        variantId: 1n,
        quantity,
      },
    ],
    products,
    address,
    billing: null,
    paymentMethod: "cod",
    note: null,
    fees,
    now: NOW,
  });

describe("computeTotals", () => {
  it("adds the flat fee and rounds tax half up", () => {
    expect(computeTotals(2505n, fees)).toEqual({
      subtotal: 2505n,
      shippingFee: 500n,
      tax: 251n,
      total: 3256n,
    });
  });
  it("ships free from freeOver", () => {
    expect(computeTotals(10000n, fees).shippingFee).toBe(0n);
    expect(
      computeTotals(10000n, {
        ...fees,
        freeOver: null,
      }).shippingFee,
    ).toBe(500n);
  });
});

describe("order status", () => {
  it("follows the allowed transitions", () => {
    expect(canTransition("pending", "processing")).toBe(true);
    expect(canTransition("processing", "cancelled")).toBe(true);
    expect(canTransition("shipped", "cancelled")).toBe(false);
    expect(canTransition("delivered", "pending")).toBe(false);
  });

  it("restocks when cancelled and records events", () => {
    const order = place([
      product(),
    ]);
    expect(order.snapshot().total).toBe(5000n + 500n + 500n);
    order.changeStatus("cancelled", 1n);
    expect(order.restock).toBe(true);
    expect(order.takeEvents().map((e) => e.type)).toEqual([
      "placed",
      "status_changed",
    ]);
  });

  it("lets customers cancel only pending orders", () => {
    const order = place([
      product(),
    ]);
    order.changeStatus("processing", 1n);
    expect(() => order.cancelByCustomer(7n)).toThrow(/pending/);
  });

  it("refuses inactive products and missing stock", () => {
    expect(() =>
      place([
        product({
          status: "draft",
        }),
      ]),
    ).toThrow(/not for sale/);
    expect(() =>
      place([
        product({
          stock: 1,
        }),
      ]),
    ).toThrow(/Only 1/);
  });

  it("ignores stock when not tracked", () => {
    expect(() =>
      place([
        product({
          trackStock: false,
          stock: 0,
        }),
      ]),
    ).not.toThrow();
  });
});

describe("sale prices", () => {
  const sale = (startsAt: string | null, endsAt: string | null) => ({
    listPrice: 2500n,
    salePrice: 2000n,
    saleStartsAt: startsAt,
    saleEndsAt: endsAt,
  });

  it("uses the sale price inside its window", () => {
    expect(effectivePrice(sale(null, null), NOW)).toBe(2000n);
    expect(
      effectivePrice(sale("2026-11-01T00:00:00Z", "2026-11-02T00:00:00Z"), NOW),
    ).toBe(2000n);
  });

  it("uses the list price before or after the window, or without a sale", () => {
    expect(effectivePrice(sale("2026-11-02T00:00:00Z", null), NOW)).toBe(2500n);
    // The end is exclusive
    expect(effectivePrice(sale(null, NOW.toISOString()), NOW)).toBe(2500n);
    expect(
      effectivePrice(
        {
          ...sale(null, null),
          salePrice: null,
        },
        NOW,
      ),
    ).toBe(2500n);
  });

  it("charges the sale price at checkout and keeps the list price", () => {
    const order = place([
      product({
        salePrice: 2000n,
      }),
    ]);
    const [item] = order.snapshot().items;
    expect(item.unitPrice).toBe(2000n);
    expect(item.listPrice).toBe(2500n);
    expect(order.snapshot().subtotal).toBe(4000n);
  });

  it("refuses a sale price not below the list price, or a backwards window", () => {
    const base = {
      name: "Shirt",
      slug: "shirt",
    };
    expect(() =>
      Product.create({
        ...base,
        variants: [
          {
            listPrice: 2500n,
            salePrice: 2500n,
          },
        ],
      }),
    ).toThrow(InvalidShopInputError);
    expect(() =>
      Product.create({
        ...base,
        variants: [
          {
            listPrice: 2500n,
            salePrice: 2000n,
          },
        ],
        saleStartsAt: "2026-11-02T00:00:00Z",
        saleEndsAt: "2026-11-01T00:00:00Z",
      }),
    ).toThrow(InvalidShopInputError);
  });
});

describe("billingDetails", () => {
  const office: AddressFields = {
    ...address,
    line1: "Office",
    city: "Hue",
  };

  it("is null when it adds nothing", () => {
    expect(
      billingDetails({
        address: null,
        shipping: address,
        company: " ",
        taxCode: null,
      }),
    ).toBeNull();
  });

  it("copies the shipping address for company details only", () => {
    expect(
      billingDetails({
        address: null,
        shipping: address,
        company: " Acme Co ",
        taxCode: "0101234567",
      }),
    ).toEqual({
      ...address,
      company: "Acme Co",
      taxCode: "0101234567",
    });
  });

  it("uses another address", () => {
    expect(
      billingDetails({
        address: office,
        shipping: address,
        company: null,
        taxCode: null,
      }),
    ).toEqual({
      ...office,
      company: null,
      taxCode: null,
    });
  });

  it("refuses a malformed tax code", () => {
    expect(() =>
      billingDetails({
        address: null,
        shipping: address,
        company: null,
        taxCode: "<script>",
      }),
    ).toThrow(InvalidShopInputError);
  });
});
