import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Stars } from "@/components/shop/product-card";
import { WishlistButton } from "@/components/shop/wishlist-button";
import {
  getProductRatings,
  getShopCurrency,
  getShopProduct,
} from "@/lib/site/public-shop";
import { BuyForm } from "./-lib/buy-form";
import { VariantGallery } from "./-lib/gallery";
import {
  SelectedPrice,
  SelectedStock,
  VariantPicker,
  VariantProvider,
} from "./-lib/variant-picker";

export const Route = createFileRoute("/_site/shop/products/$slug")({
  loader: async ({ params }) => {
    const product = await getShopProduct({
      data: params.slug,
    });
    if (!product) {
      throw notFound();
    }
    const [currency, ratings] = await Promise.all([
      getShopCurrency(),
      getProductRatings({
        data: product.id,
      }),
    ]);
    return {
      product,
      currency,
      ratings,
    };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          {
            title: loaderData.product.name,
          },
          ...(loaderData.product.description
            ? [
                {
                  name: "description",
                  content: loaderData.product.description,
                },
              ]
            : []),
          {
            property: "og:title",
            content: loaderData.product.name,
          },
          ...(loaderData.product.cover
            ? [
                {
                  property: "og:image",
                  content: loaderData.product.cover.url,
                },
              ]
            : []),
        ]
      : [],
  }),
  notFoundComponent: () => (
    <main className="mx-auto w-full max-w-5xl px-4 py-16 text-center">
      <p className="text-muted-foreground">That product isn&apos;t here.</p>
      <Link to="/shop/products" className="underline">
        All products
      </Link>
    </main>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { product, currency, ratings } = Route.useLoaderData();
  // Cover first, then the gallery without repeating it
  const images = [
    ...(product.cover
      ? [
          product.cover,
        ]
      : []),
    ...product.gallery.filter((g) => g.assetId !== product.cover?.assetId),
  ].map((i) => i.url);
  const captions = Object.fromEntries(
    product.gallery.map((g) => [
      g.url,
      {
        title: g.title,
        description: g.description,
      },
    ]),
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-12">
        {/* The chosen variant drives the gallery, price, stock and buy form */}
        <VariantProvider product={product}>
          <div className="grid gap-8 md:grid-cols-2">
            <VariantGallery
              images={images}
              alt={product.name}
              captions={captions}
            />
            <div className="flex flex-col gap-4">
              <Link
                to="/shop/products"
                className="text-sm text-muted-foreground hover:underline"
              >
                ← All products
              </Link>
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {product.name}
                </h1>
                <WishlistButton productId={product.id} label />
              </div>
              {product.rating.average !== null && (
                <p className="flex items-center gap-2 text-sm">
                  <Stars value={product.rating.average} />
                  <span className="text-muted-foreground">
                    {product.rating.average.toFixed(1)} ({product.rating.count})
                  </span>
                </p>
              )}
              <SelectedPrice currency={currency} className="text-2xl" />
              {product.description && (
                <p className="text-muted-foreground">{product.description}</p>
              )}
              <VariantPicker />
              <SelectedStock />
              {product.inStock && <BuyForm slug={product.slug} />}
            </div>
          </div>
        </VariantProvider>
        {product.content && (
          <section
            className="app_content"
            // Sanitized by the api
            // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized HTML from the api
            dangerouslySetInnerHTML={{
              __html: product.content,
            }}
          />
        )}
        {ratings.data.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-semibold">
              Reviews ({ratings.total})
            </h2>
            <ul className="flex flex-col divide-y">
              {ratings.data.map((r) => (
                <li key={r.id} className="py-4">
                  <p className="flex items-center gap-3 text-sm">
                    <Stars value={r.stars} />
                    <time
                      dateTime={r.createdAt}
                      className="text-muted-foreground"
                    >
                      {new Date(r.createdAt).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </time>
                  </p>
                  {r.body && (
                    <p className="mt-2 whitespace-pre-line">{r.body}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
