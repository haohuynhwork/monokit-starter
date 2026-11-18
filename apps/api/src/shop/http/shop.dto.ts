import { z } from "zod";

const id = z.string().regex(/^[1-9]\d{0,18}$/, "Invalid id");
const toId = id.transform((v) => BigInt(v));
// Minor units (cents) as a number or a digit string
const money = z
  .union([
    z.number().int().min(0),
    z.string().regex(/^\d{1,18}$/),
  ])
  .transform((v) => BigInt(v));
const page = (max = 100) => ({
  limit: z.coerce.number().int().min(1).max(max).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
const productStatus = z.enum([
  "draft",
  "active",
  "archived",
]);
const orderStatus = z.enum([
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "rejected",
]);
const paymentMethod = z.enum([
  "cod",
  "bank_transfer",
]);
const paymentStatus = z.enum([
  "unpaid",
  "paid",
  "refunded",
]);

// --- Categories ---

export const createCategorySchema = z.object({
  name: z.string().max(255),
  slug: z.string().max(255),
  parentId: toId.nullable().default(null),
  position: z.number().int().min(0).max(100000).optional(),
});
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema
  .extend({
    parentId: toId.nullable(),
  })
  .partial();
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;

// --- Products ---

export const listProductsSchema = z.object({
  status: productStatus.optional(),
  q: z.string().max(200).optional(),
  categoryId: toId.optional(),
  sort: z
    .enum([
      "newest",
      "price_asc",
      "price_desc",
      "name",
    ])
    .default("newest"),
  ...page(),
});
export type ListProductsDto = z.infer<typeof listProductsSchema>;

export const shopProductsSchema = listProductsSchema.omit({
  status: true,
});
export type ShopProductsDto = z.infer<typeof shopProductsSchema>;

const variantFields = z.object({
  // Omit to add a variant; variants left out of the list are deleted
  id: toId.optional(),
  sku: z.string().max(64).nullable().optional(),
  listPrice: money,
  // null: no sale
  salePrice: money.nullable().optional(),
  // Off: stock isn't counted (the number is kept)
  trackStock: z.boolean().optional(),
  stock: z.number().int().min(0).optional(),
  // Option name -> value, one per option; omit without options
  values: z.record(z.string().max(64), z.string().max(64)).optional(),
});

const productFields = {
  categoryId: toId.nullable(),
  name: z.string().max(255),
  slug: z.string().max(255),
  // Short summary: listings and the meta description
  description: z.string().max(500),
  // HTML from the rich-text editor; sanitized by the api
  content: z.string().max(1_000_000),
  // The window for every variant's salePrice; ISO times, null: open-ended
  saleStartsAt: z.iso
    .datetime({
      offset: true,
    })
    .nullable(),
  saleEndsAt: z.iso
    .datetime({
      offset: true,
    })
    .nullable(),
  status: productStatus,
  // Replaces the list; send variants with it
  options: z
    .array(
      z.object({
        name: z.string().max(64),
        values: z.array(z.string().max(64)).min(1).max(50),
      }),
    )
    .max(3),
  // Replaces the list; one without options
  variants: z.array(variantFields).min(1).max(100),
};
export const createProductSchema = z.object(productFields).partial().required({
  name: true,
  slug: true,
  variants: true,
});
export type CreateProductDto = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object(productFields).partial();
export type UpdateProductDto = z.infer<typeof updateProductSchema>;

export const productImagesSchema = z.object({
  cover: toId.nullable().optional(),
  // The whole gallery in order; captions are optional
  gallery: z
    .array(
      z.object({
        assetId: toId,
        title: z.string().max(255).nullable().optional(),
        description: z.string().max(1000).nullable().optional(),
      }),
    )
    .max(50)
    .optional(),
  // Variant id -> its own image; null removes. Only listed variants change.
  variants: z
    .record(z.string().regex(/^\d+$/), toId.nullable())
    .optional()
    .meta({
      description: "Variant id -> asset id (null removes)",
    }),
  // Per option value, e.g. { option: 'Color', value: 'Red', image: '12' }
  optionValues: z
    .array(
      z.object({
        option: z.string(),
        value: z.string(),
        image: toId.nullable(),
      }),
    )
    .max(150)
    .optional(),
});
export type ProductImagesDto = z.infer<typeof productImagesSchema>;

// --- Ratings ---

export const rateSchema = z.object({
  stars: z.number().int().min(1).max(5),
  body: z.string().max(2000).nullable().default(null),
});
export type RateDto = z.infer<typeof rateSchema>;

export const pageSchema = z.object(page(50));
export type PageDto = z.infer<typeof pageSchema>;

// --- Addresses ---

const addressFields = {
  label: z.string().max(100).nullable(),
  recipientName: z.string().max(255),
  phone: z.string().max(32),
  line1: z.string().max(255),
  line2: z.string().max(255).nullable(),
  city: z.string().max(255),
  // ISO 3166-2 from the picker; the api fills region with its name
  regionCode: z.string().max(10).nullable(),
  region: z.string().max(255).nullable(),
  postalCode: z.string().max(32).nullable(),
  countryCode: z.string().length(2),
};
export const createAddressSchema = z.object({
  ...addressFields,
  label: addressFields.label.default(null),
  line2: addressFields.line2.default(null),
  regionCode: addressFields.regionCode.default(null),
  region: addressFields.region.default(null),
  postalCode: addressFields.postalCode.default(null),
  isDefault: z.boolean().optional(),
});
export type CreateAddressDto = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = z
  .object({
    ...addressFields,
    isDefault: z.boolean(),
  })
  .partial();
export type UpdateAddressDto = z.infer<typeof updateAddressSchema>;

// --- Orders ---

export const placeOrderSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: toId,
        quantity: z.number().int().min(1).max(1000),
      }),
    )
    .min(1)
    .max(100),
  addressId: toId,
  paymentMethod,
  note: z.string().max(1000).nullable().default(null),
  // Omit to bill the shipping address. addressId null: bill the shipping
  // address, with the company details.
  billing: z
    .object({
      addressId: toId.nullable().default(null),
      company: z.string().max(255).nullable().default(null),
      taxCode: z.string().max(32).nullable().default(null),
    })
    .optional(),
});
export type PlaceOrderDto = z.infer<typeof placeOrderSchema>;

export const listOrdersSchema = z.object({
  status: orderStatus.optional(),
  q: z.string().max(200).optional(),
  ...page(),
});
export type ListOrdersDto = z.infer<typeof listOrdersSchema>;

export const myOrdersSchema = listOrdersSchema.omit({
  q: true,
});
export type MyOrdersDto = z.infer<typeof myOrdersSchema>;

export const orderStatusSchema = z.object({
  status: orderStatus,
  trackingNumber: z.string().max(100).nullable().optional(),
});
export type OrderStatusDto = z.infer<typeof orderStatusSchema>;

export const orderPaymentSchema = z.object({
  paymentStatus,
});
export type OrderPaymentDto = z.infer<typeof orderPaymentSchema>;

// --- Responses (docs only; match shop.view.ts) ---

const asset = z.object({
  assetId: z.string(),
  url: z.string().nullable(),
});

export const categoryViewSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  name: z.string(),
  slug: z.string(),
  position: z.number().int(),
});

const variantViewSchema = z.object({
  id: z.string(),
  sku: z.string().nullable(),
  values: z.record(z.string(), z.string()).meta({
    description: "Option name -> value; {} without options",
  }),
  name: z.string().meta({
    description: '"M / Red"; empty without options',
  }),
  listPrice: z.string().meta({
    description: "Regular price, minor units of shop.currency",
  }),
  salePrice: z.string().nullable().meta({
    description: "Sale price while the product's window is open now",
  }),
  price: z.string().meta({
    description: "What it costs now: salePrice ?? listPrice",
  }),
  sale: z.string().nullable().optional().meta({
    description: "The sale price as set; staff endpoints only",
  }),
  trackStock: z.boolean(),
  stock: z.number().int().nullable().meta({
    description: "Public shop: null unless trackStock",
  }),
  inStock: z.boolean(),
  image: asset.nullable().meta({
    description: "The variant's own image; staff pick it",
  }),
  imageUrl: z.string().nullable().meta({
    description:
      "What to show: its own image, else an option value image, else the cover",
  }),
});

export const productViewSchema = z.object({
  id: z.string(),
  categoryId: z.string().nullable(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  content: z.string().optional().meta({
    description: "Sanitized HTML; detail endpoints only",
  }),
  priceMin: z.string().meta({
    description: "Lowest variant price now",
  }),
  priceMax: z.string().meta({
    description: "Highest variant price now",
  }),
  sale: z
    .object({
      startsAt: z.string().nullable(),
      endsAt: z.string().nullable(),
    })
    .optional()
    .meta({
      description: "The sale window as set; staff endpoints only",
    }),
  inStock: z.boolean().meta({
    description: "Some variant is in stock",
  }),
  options: z.array(
    z.object({
      name: z.string(),
      values: z.array(z.string()),
      images: z.record(z.string(), asset).meta({
        description: "Value -> its image; values without one are left out",
      }),
    }),
  ),
  variants: z.array(variantViewSchema),
  status: productStatus,
  rating: z.object({
    count: z.number().int(),
    average: z.number().nullable(),
  }),
  cover: asset.nullable(),
  gallery: z.array(
    asset.extend({
      title: z.string().nullable(),
      description: z.string().nullable(),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ratingViewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  stars: z.number().int(),
  body: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const addressShape = z.object({
  label: z.string().nullable(),
  recipientName: z.string(),
  phone: z.string(),
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  regionCode: z.string().nullable(),
  region: z.string().nullable(),
  postalCode: z.string().nullable(),
  countryCode: z.string(),
});
export const addressViewSchema = addressShape.extend({
  id: z.string(),
  isDefault: z.boolean(),
});

export const orderSummarySchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  status: orderStatus,
  paymentMethod,
  paymentStatus,
  currency: z.string(),
  total: z.string(),
  itemCount: z.number().int(),
  recipientName: z.string(),
  createdAt: z.string(),
});

export const orderViewSchema = orderSummarySchema
  .omit({
    itemCount: true,
    recipientName: true,
  })
  .extend({
    subtotal: z.string(),
    shippingFee: z.string(),
    tax: z.string(),
    shippingAddress: addressShape,
    billingAddress: addressShape
      .extend({
        company: z.string().nullable(),
        taxCode: z.string().nullable(),
      })
      .nullable()
      .meta({
        description: "Null: bill the shipping address (no company details)",
      }),
    trackingNumber: z.string().nullable(),
    paidAt: z.string().nullable(),
    note: z.string().nullable(),
    updatedAt: z.string(),
    items: z.array(
      z.object({
        productId: z.string().nullable(),
        variantId: z.string().nullable(),
        name: z.string(),
        variantName: z.string(),
        sku: z.string().nullable(),
        listPrice: z.string(),
        unitPrice: z.string(),
        quantity: z.number().int(),
        lineTotal: z.string(),
      }),
    ),
    events: z.array(
      z.object({
        type: z.string(),
        data: z.record(z.string(), z.unknown()),
        actorId: z.string().nullable(),
        createdAt: z.string(),
      }),
    ),
  });

export const folderSchema = z.object({
  folderId: z.string(),
});

// --- Cart and wishlist (ideas/orders/cart.md) ---

export const addToCartSchema = z.object({
  variantId: toId,
  quantity: z.number().int().min(1).max(99).default(1),
});
export type AddToCartDto = z.infer<typeof addToCartSchema>;

export const setCartQuantitySchema = z.object({
  quantity: z.number().int().min(1).max(99),
});
export type SetCartQuantityDto = z.infer<typeof setCartQuantitySchema>;

const cartLineSchema = z.object({
  variantId: z.string(),
  quantity: z.number().int(),
  product: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
    })
    .nullable()
    .meta({
      description: "null once the product is deleted",
    }),
  variant: variantViewSchema.nullable(),
  available: z.boolean().meta({
    description: "Can be ordered as is: on sale and enough in stock",
  }),
  problem: z.string().nullable().meta({
    description: "Why not, for the customer",
  }),
  lineTotal: z.string().meta({
    description: "price * quantity, minor units; '0' when unavailable",
  }),
});

export const cartViewSchema = z.object({
  items: z.array(cartLineSchema),
  count: z.number().int().meta({
    description: "Units across all lines",
  }),
  subtotal: z.string().meta({
    description: "Available lines, before shipping, tax and coupons",
  }),
});

// A guest's cart as the browser keeps it; repeated variants add up
export const cartLinesSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: toId,
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .max(50)
    .transform((items) => {
      const merged = new Map<bigint, number>();
      for (const { variantId, quantity } of items) {
        merged.set(variantId, (merged.get(variantId) ?? 0) + quantity);
      }
      return [
        ...merged,
      ].map(([variantId, quantity]) => ({
        variantId,
        quantity: Math.min(99, quantity),
      }));
    }),
});
export type CartLinesDto = z.infer<typeof cartLinesSchema>;

// A guest's saved products as the browser keeps them
export const productIdsSchema = z.object({
  productIds: z.array(toId).max(100),
});
export type ProductIdsDto = z.infer<typeof productIdsSchema>;
