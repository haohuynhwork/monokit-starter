import { describe, expect, it } from "vitest";
import { Cart, MAX_CART_LINES, type Sellable } from "./cart.js";
import {
  InvalidShopInputError,
  OutOfStockError,
  ProductUnavailableError,
} from "./shop.errors.js";

const item = (over: Partial<Sellable> = {}): Sellable => ({
  variantId: 1n,
  label: "Hoodie (M)",
  status: "active",
  trackStock: false,
  stock: 0,
  ...over,
});

describe("cart", () => {
  it("adds to an existing line", () => {
    const cart = Cart.restore(7n, []);
    cart.add(1n, 2, item());
    cart.add(1n, 3, item());
    expect(cart.snapshot()).toEqual([
      {
        variantId: 1n,
        quantity: 5,
      },
    ]);
  });

  it("refuses products not for sale", () => {
    const cart = Cart.restore(7n, []);
    expect(() =>
      cart.add(
        1n,
        1,
        item({
          status: "draft",
        }),
      ),
    ).toThrow(ProductUnavailableError);
    expect(() => cart.add(1n, 1, undefined)).toThrow(ProductUnavailableError);
  });

  it("keeps quantities within tracked stock", () => {
    const cart = Cart.restore(7n, [
      {
        variantId: 1n,
        quantity: 2,
      },
    ]);
    const tracked = item({
      trackStock: true,
      stock: 3,
    });
    expect(() => cart.add(1n, 2, tracked)).toThrow(OutOfStockError);
    cart.setQuantity(1n, 3, tracked);
    expect(cart.snapshot()[0]?.quantity).toBe(3);
  });

  it("checks quantities and the line limit", () => {
    const cart = Cart.restore(
      7n,
      Array.from(
        {
          length: MAX_CART_LINES,
        },
        (_, i) => ({
          variantId: BigInt(i + 100),
          quantity: 1,
        }),
      ),
    );
    expect(() => cart.add(1n, 1, item())).toThrow(InvalidShopInputError);
    expect(() => cart.setQuantity(100n, 0, item())).toThrow(
      InvalidShopInputError,
    );
    expect(() => cart.setQuantity(1n, 1, item())).toThrow(
      InvalidShopInputError,
    );
  });

  it("removes lines", () => {
    const cart = Cart.restore(7n, [
      {
        variantId: 1n,
        quantity: 1,
      },
      {
        variantId: 2n,
        quantity: 1,
      },
    ]);
    cart.remove([
      1n,
      9n,
    ]);
    expect(cart.snapshot().map((l) => l.variantId)).toEqual([
      2n,
    ]);
  });

  it("merges a guest cart, skipping and capping what it must", () => {
    const cart = Cart.restore(7n, [
      {
        variantId: 1n,
        quantity: 2,
      },
    ]);
    cart.merge(
      [
        {
          variantId: 1n,
          quantity: 5,
        },
        {
          variantId: 2n,
          quantity: 1,
        },
        {
          variantId: 3n,
          quantity: 1,
        },
        {
          variantId: 4n,
          quantity: 1,
        },
      ],
      [
        item({
          variantId: 1n,
          trackStock: true,
          stock: 4,
        }),
        item({
          variantId: 2n,
        }),
        item({
          variantId: 3n,
          status: "archived",
        }),
        item({
          variantId: 4n,
          trackStock: true,
          stock: 0,
        }),
      ],
    );
    expect(cart.snapshot()).toEqual([
      {
        variantId: 1n,
        quantity: 4,
      },
      {
        variantId: 2n,
        quantity: 1,
      },
    ]);
  });
});
