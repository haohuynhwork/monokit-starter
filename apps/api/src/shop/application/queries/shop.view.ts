import type { QueryBus } from "@nestjs/cqrs";
import type { Db } from "@packages/nest";
import { GetAssetUrlQuery } from "../../../storage/application/queries/get-asset-url.query.js";
import {
  GetAssetUsagesQuery,
  type UsedAsset,
} from "../../../storage/application/queries/get-asset-usages.query.js";
import type { AddressFields } from "../../domain/address.js";
import type {
  BillingDetails,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "../../domain/order.js";
import {
  effectivePrice,
  isSaleActive,
  type ProductStatus,
  variantName,
} from "../../domain/product.js";

// Response shapes. Ids and money (minor units) are strings: BigInt has no
// JSON form.

export interface CategoryView {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  position: number;
}

export interface GalleryItemView extends UsedAsset {
  title: string | null;
  description: string | null;
}

export interface VariantView {
  id: string;
  sku: string | null;
  // Option name -> value; {} without options
  values: Record<string, string>;
  // "M / Red"; '' without options
  name: string;
  // Regular price
  listPrice: string;
  // The sale price while the product's sale window is open now, else null
  salePrice: string | null;
  // What it costs now: salePrice ?? listPrice
  price: string;
  // The sale price as set, even outside the window. Staff only.
  sale?: string | null;
  trackStock: boolean;
  // The count; staff always see it, the public shop only when tracked
  stock: number | null;
  // Untracked variants are always in stock
  inStock: boolean;
  // Its own image, as staff picked it
  image: UsedAsset | null;
  // What to show: its own image, else the image of one of its values (in
  // option order), else the product cover
  imageUrl: string | null;
}

export interface ProductView {
  id: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string;
  // Sanitized HTML; detail endpoints only, not lists
  content?: string;
  // Lowest and highest price now among the variants
  priceMin: string;
  priceMax: string;
  // The sale window as set, including a future or past one. Staff only:
  // the public shop strips it (see toPublicProduct).
  sale?: {
    startsAt: string | null;
    endsAt: string | null;
  };
  // Some variant is in stock
  inStock: boolean;
  options: {
    name: string;
    values: string[];
    // Value -> its image; values without one are left out
    images: Record<string, UsedAsset>;
  }[];
  variants: VariantView[];
  status: ProductStatus;
  rating: {
    count: number;
    average: number | null;
  };
  cover: UsedAsset | null;
  gallery: GalleryItemView[];
  createdAt: string;
  updatedAt: string;
}

export const PRODUCT_FIELDS = [
  "id",
  "categoryId",
  "name",
  "slug",
  "description",
  "saleStartsAt",
  "saleEndsAt",
  "status",
  "ratingCount",
  "ratingSum",
  "createdAt",
  "updatedAt",
] as const;

type ProductRow = {
  id: bigint;
  categoryId: bigint | null;
  name: string;
  slug: string;
  description: string;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  status: ProductStatus;
  ratingCount: number;
  ratingSum: number;
  createdAt: string;
  updatedAt: string;
};

// The shop doesn't announce sales before they start, and an untracked
// variant's stock number means nothing
export function toPublicProduct(view: ProductView): ProductView {
  const copy = {
    ...view,
    variants: view.variants.map((v) => {
      const variant = {
        ...v,
        stock: v.trackStock ? v.stock : null,
      };
      delete variant.sale;
      return variant;
    }),
  };
  delete copy.sale;
  return copy;
}

// Covers for a list; the gallery only with `gallery` (detail pages)
export async function toProductViews(
  rows: ProductRow[],
  db: Db,
  queries: QueryBus,
  gallery = false,
): Promise<ProductView[]> {
  const now = new Date();
  const ids = rows.map((r) => r.id);
  const [covers, galleries, variants] = await Promise.all([
    queries.execute(new GetAssetUsagesQuery("product", ids, "cover")),
    gallery
      ? loadGalleries(db, queries, ids)
      : new Map<bigint, GalleryItemView[]>(),
    loadVariants(db, ids),
  ]);
  const all = [
    ...variants.values(),
  ];
  const [variantImages, valueImages] = await Promise.all([
    queries.execute(
      new GetAssetUsagesQuery(
        "product_variant",
        all.flatMap((p) => p.list.map((v) => v.id)),
        "image",
      ),
    ),
    queries.execute(
      new GetAssetUsagesQuery(
        "product_option_value",
        all.flatMap((p) => p.options.flatMap((o) => o.valueIds)),
        "image",
      ),
    ),
  ]);
  return rows.map((r) => {
    const { options, list } = variants.get(r.id) ?? {
      options: [],
      list: [],
    };
    const cover = covers.get(String(r.id))?.[0] ?? null;
    const valueImage = (id: bigint) => valueImages.get(String(id))?.[0];
    const views: VariantView[] = list.map((v) => {
      const image = variantImages.get(String(v.id))?.[0] ?? null;
      const shown =
        image ??
        v.valueIds.map(valueImage).find((a) => a !== undefined) ??
        cover;
      const sale = {
        ...v,
        saleStartsAt: r.saleStartsAt,
        saleEndsAt: r.saleEndsAt,
      };
      return {
        id: String(v.id),
        sku: v.sku,
        values: v.values,
        name: variantName(options, v.values),
        listPrice: String(v.listPrice),
        salePrice: isSaleActive(sale, now) ? String(v.salePrice) : null,
        price: String(effectivePrice(sale, now)),
        sale: v.salePrice === null ? null : String(v.salePrice),
        trackStock: v.trackStock,
        stock: v.stock,
        inStock: !v.trackStock || v.stock > 0,
        image,
        imageUrl: shown?.url ?? null,
      };
    });
    const prices = views.map((v) => BigInt(v.price));
    return {
      id: String(r.id),
      categoryId: r.categoryId === null ? null : String(r.categoryId),
      name: r.name,
      slug: r.slug,
      description: r.description,
      priceMin: String(
        prices.reduce((a, b) => (b < a ? b : a), prices[0] ?? 0n),
      ),
      priceMax: String(
        prices.reduce((a, b) => (b > a ? b : a), prices[0] ?? 0n),
      ),
      sale: {
        startsAt: r.saleStartsAt,
        endsAt: r.saleEndsAt,
      },
      inStock: views.some((v) => v.inStock),
      options: options.map((o) => ({
        name: o.name,
        values: o.values,
        images: Object.fromEntries(
          o.values.flatMap((value, i) => {
            const a = valueImage(o.valueIds[i]!);
            return a
              ? [
                  [
                    value,
                    a,
                  ],
                ]
              : [];
          }),
        ),
      })),
      variants: views,
      status: r.status,
      rating: {
        count: r.ratingCount,
        average:
          r.ratingCount > 0
            ? Math.round((r.ratingSum / r.ratingCount) * 10) / 10
            : null,
      },
      cover,
      gallery: galleries.get(r.id) ?? [],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  });
}

// Each product's gallery in order, with ready-to-use URLs
async function loadGalleries(
  db: Db,
  queries: QueryBus,
  productIds: bigint[],
): Promise<Map<bigint, GalleryItemView[]>> {
  const rows = productIds.length
    ? await db.orm.public.ProductGalleryItem.select(
        "productId",
        "assetId",
        "title",
        "description",
      )
        .where((g) => g.productId.in(productIds))
        .orderBy([
          (g) => g.position.asc(),
          (g) => g.id.asc(),
        ])
        .all()
    : [];
  const urls = await Promise.all(
    rows.map((r) => queries.execute(new GetAssetUrlQuery(r.assetId))),
  );
  const result = new Map<bigint, GalleryItemView[]>();
  for (const [i, r] of rows.entries()) {
    result.set(r.productId, [
      ...(result.get(r.productId) ?? []),
      {
        assetId: String(r.assetId),
        url: urls[i]!,
        title: r.title,
        description: r.description,
      },
    ]);
  }
  return result;
}

// Live variants (in order) and options of each product
async function loadVariants(db: Db, productIds: bigint[]) {
  const result = new Map<
    bigint,
    {
      options: {
        name: string;
        values: string[];
        valueIds: bigint[];
      }[];
      list: {
        id: bigint;
        sku: string | null;
        listPrice: bigint;
        salePrice: bigint | null;
        trackStock: boolean;
        stock: number;
        values: Record<string, string>;
        // Its value ids in option order
        valueIds: bigint[];
      }[];
    }
  >();
  if (!productIds.length) {
    return result;
  }
  const [variants, options] = await Promise.all([
    db.orm.public.ProductVariant.select(
      "id",
      "productId",
      "sku",
      "listPrice",
      "salePrice",
      "trackStock",
      "stock",
    )
      .where((v) => v.productId.in(productIds))
      .where((v) => v.deletedAt.isNull())
      .orderBy([
        (v) => v.position.asc(),
        (v) => v.id.asc(),
      ])
      .all(),
    db.orm.public.ProductOption.select("id", "productId", "name")
      .where((o) => o.productId.in(productIds))
      .orderBy([
        (o) => o.position.asc(),
        (o) => o.id.asc(),
      ])
      .all(),
  ]);
  const [values, links] = await Promise.all([
    options.length
      ? db.orm.public.ProductOptionValue.select("id", "optionId", "value")
          .where((v) => v.optionId.in(options.map((o) => o.id)))
          .orderBy([
            (v) => v.position.asc(),
            (v) => v.id.asc(),
          ])
          .all()
      : [],
    variants.length && options.length
      ? db.orm.public.ProductVariantValue.select(
          "variantId",
          "optionId",
          "valueId",
        )
          .where((l) => l.variantId.in(variants.map((v) => v.id)))
          .all()
      : [],
  ]);
  const optionName = new Map(
    options.map((o) => [
      o.id,
      o.name,
    ]),
  );
  const valueText = new Map(
    values.map((v) => [
      v.id,
      v.value,
    ]),
  );
  for (const id of productIds) {
    result.set(id, {
      options: options
        .filter((o) => o.productId === id)
        .map((o) => ({
          name: o.name,
          values: values.filter((v) => v.optionId === o.id).map((v) => v.value),
          valueIds: values.filter((v) => v.optionId === o.id).map((v) => v.id),
        })),
      list: variants
        .filter((v) => v.productId === id)
        .map((v) => ({
          ...v,
          values: Object.fromEntries(
            links
              .filter((l) => l.variantId === v.id)
              .map((l) => [
                optionName.get(l.optionId)!,
                valueText.get(l.valueId)!,
              ]),
          ),
          valueIds: options
            .filter((o) => o.productId === id)
            .flatMap(
              (o) =>
                links.find((l) => l.variantId === v.id && l.optionId === o.id)
                  ?.valueId ?? [],
            ),
        })),
    });
  }
  return result;
}

export interface RatingView {
  id: string;
  userId: string;
  stars: number;
  body: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddressView extends AddressFields {
  id: string;
  isDefault: boolean;
}

export interface OrderSummary {
  id: string;
  userId: string | null;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  currency: string;
  total: string;
  itemCount: number;
  recipientName: string;
  createdAt: string;
}

export interface OrderView
  extends Omit<OrderSummary, "itemCount" | "recipientName"> {
  subtotal: string;
  shippingFee: string;
  tax: string;
  shippingAddress: AddressFields;
  // Null: bill the shipping address (no company details)
  billingAddress: BillingDetails | null;
  trackingNumber: string | null;
  paidAt: string | null;
  note: string | null;
  updatedAt: string;
  items: {
    productId: string | null;
    variantId: string | null;
    name: string;
    // "M / Red"; '' without options
    variantName: string;
    sku: string | null;
    // Regular price at checkout; above unitPrice when it was on sale
    listPrice: string;
    unitPrice: string;
    quantity: number;
    lineTotal: string;
  }[];
  events: {
    type: string;
    data: Record<string, unknown>;
    actorId: string | null;
    createdAt: string;
  }[];
}

// ILIKE treats % and _ as wildcards; match them literally
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

export interface CartLineView {
  variantId: string;
  quantity: number;
  // null once the product is deleted
  product: {
    id: string;
    name: string;
    slug: string;
  } | null;
  // The variant as the public shop shows it; null once deleted
  variant: VariantView | null;
  // Can be ordered as is: on sale, and enough in stock
  available: boolean;
  // Why not, for the customer; null when available
  problem: string | null;
  // price * quantity; '0' when unavailable
  lineTotal: string;
}

export interface CartView {
  items: CartLineView[];
  // Units across all lines
  count: number;
  // Sum of available lines, before shipping, tax and coupons
  subtotal: string;
}
