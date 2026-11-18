import { describe, expect, it } from "vitest";
import { ProductNotFoundError } from "./shop.errors.js";
import { checkWishable, wishableIds } from "./wishlist.js";

describe("wishlist", () => {
  it("saves products on sale only", () => {
    expect(() =>
      checkWishable({
        status: "active",
      }),
    ).not.toThrow();
    expect(() =>
      checkWishable({
        status: "draft",
      }),
    ).toThrow(ProductNotFoundError);
    expect(() => checkWishable(null)).toThrow(ProductNotFoundError);
  });

  it("keeps a guest's products on sale when merging", () => {
    const statuses = new Map<bigint, "draft" | "active" | "archived">([
      [
        1n,
        "active",
      ],
      [
        2n,
        "archived",
      ],
      [
        3n,
        "draft",
      ],
    ]);
    expect(
      wishableIds(statuses, [
        1n,
        2n,
        3n,
        4n,
        1n,
      ]),
    ).toEqual([
      1n,
    ]);
  });
});
