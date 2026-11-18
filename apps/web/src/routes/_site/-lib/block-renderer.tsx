import { Button } from "@packages/ui/components/button";
import { Link } from "@tanstack/react-router";
import { createContext, useContext } from "react";
import { formatMoney } from "@/lib/money";
import type { BlockData } from "@/lib/site/public-api";
import type { Block, Product } from "@/lib/types";
import { withBase } from "@/lib/url";
import { ContactForm } from "./contact-form";
import { PostList } from "./post-article";

// The page's data blocks' data (read with the page) and its id (for the
// contact form)
export const PageContext = createContext<{
  pageId: string;
  blockData: BlockData;
}>({
  pageId: "",
  blockData: {},
});

// One component per block type (ideas/pages "Blocks"). Blocks don't know
// which layout template they're in; <PageFrame> sets widths and gaps.

type Props = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const fileUrl = (key: string) => withBase(`/serve/${key}`);

export function BlockList({
  blocks,
  gap = "gap-10",
}: {
  blocks: Block[];
  gap?: string;
}) {
  return (
    <div className={`flex flex-col ${gap}`}>
      {blocks.map((b) => (
        <section key={b.id} id={b.id} className="min-w-0">
          <BlockView block={b} />
        </section>
      ))}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  const p = block.props;
  const { pageId, blockData } = useContext(PageContext);
  switch (block.type) {
    case "richText":
      return (
        <div
          className="app_content"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by the api
          dangerouslySetInnerHTML={{
            __html: str(p.html) ?? "",
          }}
        />
      );
    case "hero":
      return <Hero props={p} />;
    case "image":
      return (
        <figure>
          <img
            src={fileUrl(String(p.assetKey))}
            alt={str(p.alt) ?? ""}
            loading="lazy"
            className="w-full rounded-lg"
          />
          {str(p.caption) && (
            <figcaption className="mt-2 text-center text-sm text-muted-foreground">
              {str(p.caption)}
            </figcaption>
          )}
        </figure>
      );
    case "gallery":
      return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {((p.assetKeys as string[]) ?? []).map((k) => (
            <img
              key={k}
              src={fileUrl(k)}
              alt=""
              loading="lazy"
              className="aspect-square w-full rounded-md object-cover"
            />
          ))}
        </div>
      );
    case "postList": {
      const posts = blockData[block.id]?.posts ?? [];
      return posts.length ? <PostList posts={posts} /> : null;
    }
    case "productGrid": {
      const data = blockData[block.id];
      if (!data?.products?.length) {
        return null;
      }
      return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]">
          {data.products.map((product) => (
            <ProductTile
              key={product.id}
              product={product}
              currency={data.currency ?? "USD"}
            />
          ))}
        </div>
      );
    }
    case "contactForm":
      return (
        <ContactForm
          pageId={pageId}
          blockId={block.id}
          title={str(p.title)}
          fields={
            (p.fields as ("name" | "email" | "phone" | "message")[]) ?? []
          }
        />
      );
    case "faq":
      return (
        <div className="divide-y rounded-lg border">
          {(
            (p.items as {
              question: string;
              answer: string;
            }[]) ?? []
          ).map((item, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: FAQ items have no ids
            <details key={i} className="group p-4">
              <summary className="cursor-pointer font-medium">
                {item.question}
              </summary>
              <p className="mt-2 whitespace-pre-line text-muted-foreground">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      );
    case "columns": {
      const columns =
        (p.columns as {
          blocks: Block[];
        }[]) ?? [];
      return (
        <div
          className="grid gap-8 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
          style={
            {
              "--cols": columns.length,
            } as React.CSSProperties
          }
        >
          {columns.map((c, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: columns have no ids
            <BlockList key={i} blocks={c.blocks} gap="gap-6" />
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}

function Hero({ props: p }: { props: Props }) {
  const image = str(p.imageKey);
  const cta = p.cta as
    | {
        label: string;
        href: string;
      }
    | undefined;
  return (
    <div className="relative overflow-hidden rounded-xl bg-muted">
      {image && (
        <img
          src={fileUrl(image)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div
        className={`relative flex min-h-64 flex-col items-start justify-end gap-3 p-8 sm:min-h-80 sm:p-12 ${image ? "bg-gradient-to-t from-black/60 to-transparent text-white" : ""}`}
      >
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
          {str(p.title)}
        </h1>
        {str(p.subtitle) && (
          <p className="max-w-2xl text-lg opacity-90">{str(p.subtitle)}</p>
        )}
        {cta && (
          <Button asChild size="lg" className="mt-2">
            {cta.href.startsWith("/") ? (
              <Link to={cta.href}>{cta.label}</Link>
            ) : (
              <a href={cta.href}>{cta.label}</a>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// A product card for the productGrid block
function ProductTile({
  product,
  currency,
}: {
  product: Product;
  currency: string;
}) {
  return (
    <Link
      to="/shop/products/$slug"
      params={{
        slug: product.slug,
      }}
      className="group flex w-full flex-col overflow-hidden rounded-lg border"
    >
      <div className="aspect-square w-full overflow-hidden bg-muted">
        {product.cover && (
          <img
            src={product.cover.url}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex flex-col gap-1 p-3">
        <h2 className="line-clamp-2 font-medium group-hover:underline">
          {product.name}
        </h2>
        <p className="font-semibold">
          {product.priceMin !== product.priceMax && (
            <span className="mr-1 text-sm font-normal text-muted-foreground">
              From
            </span>
          )}
          {formatMoney(product.priceMin, currency)}
        </p>
        {!product.inStock && (
          <p className="text-xs text-muted-foreground">Out of stock</p>
        )}
      </div>
    </Link>
  );
}
