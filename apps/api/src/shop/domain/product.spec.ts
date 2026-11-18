import { describe, expect, it } from "vitest";
import { checkGallery, Product, variantName } from "./product.js";
import { InvalidShopInputError } from "./shop.errors.js";

const base = {
  name: "Shirt",
  slug: "shirt",
  variants: [
    {
      listPrice: 2500n,
    },
  ],
};

describe("Product content", () => {
  it("trims the summary and keeps the content as given", () => {
    const p = Product.create({
      ...base,
      description: "  Soft cotton.  ",
      content: "<p>Details</p>",
    });
    expect(p.snapshot().description).toBe("Soft cotton.");
    expect(p.content).toBe("<p>Details</p>");
  });

  it("refuses a summary over 500 characters", () => {
    expect(() =>
      Product.create({
        ...base,
        description: "x".repeat(501),
      }),
    ).toThrow(InvalidShopInputError);
  });
});

describe("Product variants", () => {
  const sized = () =>
    Product.create({
      name: "Shirt",
      slug: "shirt",
      options: [
        {
          name: "Size",
          values: [
            "S",
            "M",
          ],
        },
        {
          name: "Color",
          values: [
            "Red",
          ],
        },
      ],
      variants: [
        {
          listPrice: 2000n,
          values: {
            Size: "S",
            Color: "Red",
          },
        },
        {
          listPrice: 2600n,
          values: {
            Size: "M",
            Color: "Red",
          },
        },
      ],
    });

  it("needs at least one variant, and only one without options", () => {
    expect(() =>
      Product.create({
        ...base,
        variants: [],
      }),
    ).toThrow(/at least one/);
    expect(() =>
      Product.create({
        ...base,
        variants: [
          {
            listPrice: 1n,
          },
          {
            listPrice: 2n,
          },
        ],
      }),
    ).toThrow(InvalidShopInputError);
  });

  it("caches the price range of live variants", () => {
    expect(sized().priceRange()).toEqual({
      minPrice: 2000n,
      maxPrice: 2600n,
    });
  });

  it("needs one known value per option, in unique combinations", () => {
    const options = [
      {
        name: "Size",
        values: [
          "S",
          "M",
        ],
      },
    ];
    expect(() =>
      Product.create({
        ...base,
        options,
        variants: [
          {
            listPrice: 1n,
          },
        ],
      }),
    ).toThrow(/value for Size/);
    expect(() =>
      Product.create({
        ...base,
        options,
        variants: [
          {
            listPrice: 1n,
            values: {
              Size: "XL",
            },
          },
        ],
      }),
    ).toThrow(/not a value/);
    expect(() =>
      Product.create({
        ...base,
        options,
        variants: [
          {
            listPrice: 1n,
            values: {
              Size: "S",
            },
          },
          {
            listPrice: 2n,
            values: {
              Size: "S",
            },
          },
        ],
      }),
    ).toThrow(/Two variants are S/);
  });

  it("soft-deletes saved variants left out of an update", () => {
    const p = Product.restore({
      ...sized().snapshot(),
      id: 1n,
      variants: sized()
        .snapshot()
        .variants.map((v, i) => ({
          ...v,
          id: BigInt(i + 1),
        })),
    });
    p.update({
      variants: [
        {
          id: 2n,
          listPrice: 2600n,
          values: {
            Size: "M",
            Color: "Red",
          },
        },
      ],
    });
    expect(p.liveVariants().map((v) => v.id)).toEqual([
      2n,
    ]);
    expect(p.snapshot().variants).toHaveLength(2);
  });

  it("refuses options without variants", () => {
    expect(() =>
      sized().update({
        options: [
          {
            name: "Size",
            values: [
              "S",
            ],
          },
        ],
      }),
    ).toThrow(/together/);
  });

  it("names variants in option order", () => {
    expect(
      variantName(
        [
          {
            name: "Size",
          },
          {
            name: "Color",
          },
        ],
        {
          Color: "Red",
          Size: "M",
        },
      ),
    ).toBe("M / Red");
  });
});

describe("checkGallery", () => {
  it("trims captions and stores blank ones as null", () => {
    expect(
      checkGallery([
        {
          assetId: 1n,
          title: "  Front  ",
          description: "   ",
        },
        {
          assetId: 2n,
        },
      ]),
    ).toEqual([
      {
        assetId: 1n,
        title: "Front",
        description: null,
      },
      {
        assetId: 2n,
        title: null,
        description: null,
      },
    ]);
  });

  it("refuses the same image twice", () => {
    expect(() =>
      checkGallery([
        {
          assetId: 1n,
        },
        {
          assetId: 1n,
        },
      ]),
    ).toThrow(InvalidShopInputError);
  });

  it("refuses a title that is too long", () => {
    expect(() =>
      checkGallery([
        {
          assetId: 1n,
          title: "x".repeat(256),
        },
      ]),
    ).toThrow(InvalidShopInputError);
  });
});
