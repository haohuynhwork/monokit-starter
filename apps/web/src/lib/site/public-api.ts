import type { ResponseEnvelope } from "@packages/contracts";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import type {
  Block,
  Product,
  PublicPage,
  PublicPost,
  PublicTag,
} from "@/lib/types";

// Public site reads, run on the server (SSR and client navigation alike), so
// they reach the api directly at API_URL instead of through the browser's
// /api proxy

export type MenuItem = {
  title: string;
  path: string;
  children: MenuItem[];
};

// The api's URL for a path, e.g. "/public/posts" (server only)
export function apiUrl(path: string): string {
  const origin = (
    process.env.API_URL ?? `http://localhost:${process.env.API_PORT ?? 3000}`
  ).replace(/\/+$/, "");
  const prefix = (process.env.API_PREFIX ?? "")
    .replace(/^\/*/, "/")
    .replace(/\/+$/, "");
  return `${origin}${prefix}${path}`;
}

// The visitor's language, so the api serves translated posts
function languageHeaders(): Record<string, string> {
  const language = getRequestHeader("accept-language");
  return language
    ? {
        "accept-language": language,
      }
    : {};
}

async function getEnvelope<T>(
  path: string,
): Promise<ResponseEnvelope<T> | null> {
  try {
    const res = await fetch(apiUrl(path), {
      headers: languageHeaders(),
    });
    return (await res.json()) as ResponseEnvelope<T>;
  } catch {
    return null;
  }
}

async function get<T>(path: string): Promise<T | null> {
  const body = await getEnvelope<T>(path);
  return body?.status === "success" ? (body.data ?? null) : null;
}

// What the data blocks (postList, productGrid) of a page show, by block id;
// read with the page so it renders on the server
export type BlockData = Record<
  string,
  {
    posts?: PublicPost[];
    products?: Product[];
    currency?: string;
  }
>;

export type PublicPageView = PublicPage & {
  blockData: BlockData;
};

const SORTS: Record<string, string> = {
  newest: "newest",
  priceAsc: "price_asc",
  priceDesc: "price_desc",
};

function allBlocks(blocks: Block[]): Block[] {
  return blocks.flatMap((b) => [
    b,
    ...(b.type === "columns"
      ? (
          (b.props.columns as
            | {
                blocks: Block[];
              }[]
            | undefined) ?? []
        ).flatMap((c) => allBlocks(c.blocks))
      : []),
  ]);
}

async function loadBlockData(page: PublicPage): Promise<BlockData> {
  const data: BlockData = {};
  const blocks = allBlocks([
    ...page.blocks,
    ...(page.layout.sidebar?.blocks ?? []),
  ]);
  let currency: Promise<string> | undefined;
  await Promise.all(
    blocks.map(async (b) => {
      const p = b.props;
      const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
      if (b.type === "postList") {
        const params = new URLSearchParams({
          limit: String(Number(p.limit ?? 5)),
        });
        if (str(p.tagId)) {
          params.set("tagId", str(p.tagId) as string);
        }
        data[b.id] = {
          posts: (await get<PublicPost[]>(`/public/posts?${params}`)) ?? [],
        };
      } else if (b.type === "productGrid") {
        const params = new URLSearchParams({
          limit: String(Number(p.limit ?? 8)),
          sort: SORTS[str(p.sort) ?? "newest"] ?? "newest",
        });
        if (str(p.productCategoryId)) {
          params.set("categoryId", str(p.productCategoryId) as string);
        }
        currency ??= get<Record<string, unknown>>("/configs/public").then(
          (c) =>
            typeof c?.["shop.currency"] === "string"
              ? (c["shop.currency"] as string)
              : "USD",
        );
        data[b.id] = {
          products: (await get<Product[]>(`/shop/products?${params}`)) ?? [],
          currency: await currency,
        };
      }
    }),
  );
  return data;
}

// Sent as the api's JSON text: Block props are typed unknown, which Start
// can't prove serializable
const fetchPublicPage = createServerFn({
  method: "GET",
})
  .validator((path: string) => path)
  .handler(async ({ data: path }) => {
    const page = await get<PublicPage>(
      `/public/pages/by-path?${new URLSearchParams({
        path,
      })}`,
    );
    return JSON.stringify(
      page
        ? {
            ...page,
            blockData: await loadBlockData(page),
          }
        : null,
    );
  });

// A live page by its path ("about", "company/team"); null when there is none
export async function getPublicPage(
  path: string,
): Promise<PublicPageView | null> {
  return JSON.parse(
    await fetchPublicPage({
      data: path,
    }),
  ) as PublicPageView | null;
}

// A live post at its path, in the visitor's language; null when there is none
export const getPublicPost = createServerFn({
  method: "GET",
})
  .validator((path: string) => path)
  .handler(async ({ data: path }) =>
    get<PublicPost>(
      `/public/posts/by-path?${new URLSearchParams({
        path,
      })}`,
    ),
  );

export const getLatestPosts = createServerFn({
  method: "GET",
})
  .validator((input: { limit: number; tag?: string }) => input)
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      limit: String(data.limit),
    });
    if (data.tag) {
      params.set("tag", data.tag);
    }
    return (await get<PublicPost[]>(`/public/posts?${params}`)) ?? [];
  });

// One page of the /posts list: `q` searches title and content, `tag` is a tag
// slug; `total` counts every match. null when the api is unreachable.
export const getPostsPage = createServerFn({
  method: "GET",
})
  .validator(
    (input: { page: number; pageSize: number; q?: string; tag?: string }) =>
      input,
  )
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      limit: String(data.pageSize),
      offset: String((data.page - 1) * data.pageSize),
    });
    if (data.q) {
      params.set("q", data.q);
    }
    if (data.tag) {
      params.set("tag", data.tag);
    }
    const body = await getEnvelope<PublicPost[]>(`/public/posts?${params}`);
    if (body?.status !== "success" || !body.data) {
      return null;
    }
    const total = (
      body as {
        meta?: {
          total: number;
        };
      }
    ).meta?.total;
    return {
      posts: body.data,
      total: total ?? body.data.length,
    };
  });

// Tags with live posts, by name
export const getPostTags = createServerFn({
  method: "GET",
}).handler(async () => (await get<PublicTag[]>("/public/posts/tags")) ?? []);

export const getMenu = createServerFn({
  method: "GET",
}).handler(async () => (await get<MenuItem[]>("/public/pages/menu")) ?? []);
