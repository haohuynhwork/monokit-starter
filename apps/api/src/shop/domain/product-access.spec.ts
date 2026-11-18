import { describe, expect, it } from "vitest";
import { ShopForbiddenError } from "./shop.errors.js";
import { checkCanEditProduct } from "./shop.js";

const actor = (...permissions: string[]) => ({
  id: 5n,
  permissions: new Set(permissions),
});

describe("checkCanEditProduct", () => {
  it("lets shop staff edit products they created", () => {
    expect(() =>
      checkCanEditProduct(actor("shop:manage"), {
        createdById: 5n,
      }),
    ).not.toThrow();
  });

  it("refuses other people's and seeded products", () => {
    for (const createdById of [
      6n,
      null,
    ]) {
      expect(() =>
        checkCanEditProduct(actor("shop:manage"), {
          createdById,
        }),
      ).toThrow(ShopForbiddenError);
    }
  });

  it("refuses without shop access, even for own products", () => {
    expect(() =>
      checkCanEditProduct(actor(), {
        createdById: 5n,
      }),
    ).toThrow(ShopForbiddenError);
  });

  it("product:edit:any covers every product", () => {
    expect(() =>
      checkCanEditProduct(actor("product:edit:any"), {
        createdById: null,
      }),
    ).not.toThrow();
  });
});
