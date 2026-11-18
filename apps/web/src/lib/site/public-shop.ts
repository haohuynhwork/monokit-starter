import type { ResponseEnvelope } from "@packages/contracts";
import { createServerFn } from "@tanstack/react-start";
import type { Cart, Category, Product } from "@/lib/types";

// Public shop reads (GET /shop/*), run on the server (SSR and client
// navigation alike), so they reach the api directly at API_URL instead of
// through the browser's /api proxy

export type Paged<T> = {
  data: T[];
  total: number;
};

export type Rating = {
  id: string;
  userId: string;
  stars: number;
  body: string | null;
  createdAt: string;
  updatedAt: string;
};

export const PRODUCT_SORTS = {
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  name: "Name",
} as const;
export type ProductSort = keyof typeof PRODUCT_SORTS;

async function call<T>(
  path: string,
  body?: unknown,
): Promise<{
  data: T;
  total?: number;
} | null> {
  const origin = (
    process.env.API_URL ?? `http://localhost:${process.env.API_PORT ?? 3000}`
  ).replace(/\/+$/, "");
  const prefix = (process.env.API_PREFIX ?? "")
    .replace(/^\/*/, "/")
    .replace(/\/+$/, "");
  try {
    const res = await fetch(`${origin}${prefix}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers:
        body === undefined
          ? undefined
          : {
              "Content-Type": "application/json",
            },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json()) as ResponseEnvelope<T> & {
      meta?: {
        total?: number;
      };
    };
    return json.status === "success" && json.data !== undefined
      ? {
          data: json.data,
          total: json.meta?.total,
        }
      : null;
  } catch {
    return null;
  }
}

async function paged<T>(path: string): Promise<Paged<T>> {
  const res = await call<T[]>(path);
  return {
    data: res?.data ?? [],
    total: res?.total ?? res?.data.length ?? 0,
  };
}

export const getShopCategories = createServerFn({
  method: "GET",
}).handler(
  async () => (await call<Category[]>("/shop/categories"))?.data ?? [],
);

export const listShopProducts = createServerFn({
  method: "GET",
})
  .validator(
    (p: {
      q?: string;
      categoryId?: string;
      sort?: ProductSort;
      limit: number;
      offset: number;
    }) => p,
  )
  .handler(async ({ data: p }) => {
    const query = new URLSearchParams({
      limit: String(p.limit),
      offset: String(p.offset),
    });
    for (const k of [
      "q",
      "categoryId",
      "sort",
    ] as const) {
      if (p[k]) {
        query.set(k, p[k]);
      }
    }
    return paged<Product>(`/shop/products?${query}`);
  });

export const getShopProduct = createServerFn({
  method: "GET",
})
  .validator((slug: string) => slug)
  .handler(
    async ({ data: slug }) =>
      (await call<Product>(`/shop/products/${encodeURIComponent(slug)}`))
        ?.data ?? null,
  );

export const getProductRatings = createServerFn({
  method: "GET",
})
  .validator((productId: string) => productId)
  .handler(({ data: productId }) =>
    paged<Rating>(
      `/shop/products/${encodeURIComponent(productId)}/ratings?limit=20&offset=0`,
    ),
  );

// The shop currency (configs 'shop.currency') for server-rendered pages
export const getShopCurrency = createServerFn({
  method: "GET",
}).handler(async () => {
  const currency = (await call<Record<string, unknown>>("/configs/public"))
    ?.data["shop.currency"];
  return typeof currency === "string" ? currency : "USD";
});

// A guest's cart (kept in the browser) priced by the api; null on failure
export const priceGuestCart = createServerFn({
  method: "POST",
})
  .validator(
    (d: {
      items: {
        variantId: string;
        quantity: number;
      }[];
    }) => d,
  )
  .handler(async ({ data }) =>
    data.items.length === 0
      ? ({
          items: [],
          count: 0,
          subtotal: "0",
        } satisfies Cart)
      : ((await call<Cart>("/shop/cart", data))?.data ?? null),
  );

// A guest's saved products (ids kept in the browser), in their order
export const listGuestWishlist = createServerFn({
  method: "POST",
})
  .validator((d: { productIds: string[] }) => d)
  .handler(async ({ data }) =>
    data.productIds.length === 0
      ? []
      : ((await call<Product[]>("/shop/wishlist", data))?.data ?? null),
  );
