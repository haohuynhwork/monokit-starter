# Products

What the shop sells. Price, SKU and stock live on variants: every product
has at least one, and a product without options has exactly one (the
default).

```sql
CREATE TABLE products (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id  BIGINT REFERENCES product_categories(id) ON DELETE SET NULL,
    name         VARCHAR(255) NOT NULL,
    slug         VARCHAR(255) NOT NULL,
    -- Short summary: listings and the meta description
    description  VARCHAR(500) NOT NULL DEFAULT '',
    -- Rich text from TinyMCE, sanitized like posts.content
    content      TEXT NOT NULL DEFAULT '',
    -- One sale window for every variant; a NULL bound is open
    sale_starts_at TIMESTAMPTZ,
    sale_ends_at   TIMESTAMPTZ,
    -- Cached from live variants' list_price, for listings and price sorts
    min_price    BIGINT NOT NULL DEFAULT 0,
    max_price    BIGINT NOT NULL DEFAULT 0,
    status       TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'active', 'archived')),
    -- Cached from product_ratings, updated with each rating
    rating_count INT NOT NULL DEFAULT 0,
    rating_sum   INT NOT NULL DEFAULT 0,
    -- Staff user who created it; kept (as NULL) when the user is deleted
    created_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ,
    CONSTRAINT products_sale_window CHECK (sale_ends_at IS NULL
        OR sale_starts_at IS NULL OR sale_ends_at > sale_starts_at),
    CONSTRAINT products_price_range CHECK (min_price >= 0 AND max_price >= min_price)
);
CREATE INDEX products_category_idx ON products (category_id);
CREATE INDEX products_created_by_idx ON products (created_by_id);
CREATE UNIQUE INDEX products_slug_unique ON products (slug) WHERE deleted_at IS NULL;

-- Axes like "Size", "Color"
CREATE TABLE product_options (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name       VARCHAR(64) NOT NULL,
    position   INT NOT NULL DEFAULT 0,
    UNIQUE (product_id, name)
);

CREATE TABLE product_option_values (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    option_id BIGINT NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
    value     VARCHAR(64) NOT NULL,
    position  INT NOT NULL DEFAULT 0,
    UNIQUE (option_id, value)
);

-- What is actually sold
CREATE TABLE product_variants (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    -- Stock keeping unit, optional, unique among live variants
    sku         VARCHAR(64),
    -- Minor units of shop.currency. Regular price.
    list_price  BIGINT NOT NULL CHECK (list_price >= 0),
    -- NULL: not on sale. Applies inside the product's sale window.
    sale_price  BIGINT CHECK (sale_price IS NULL
                OR (sale_price >= 0 AND sale_price < list_price)),
    -- Off: always in stock; stock is kept but ignored
    track_stock BOOLEAN NOT NULL DEFAULT false,
    stock       INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    position    INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);
CREATE INDEX product_variants_product_idx ON product_variants (product_id);
CREATE UNIQUE INDEX product_variants_sku_unique ON product_variants (sku) WHERE sku IS NOT NULL AND deleted_at IS NULL;

-- A variant's value for each option, one row per option
CREATE TABLE product_variant_values (
    variant_id BIGINT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    option_id  BIGINT NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
    value_id   BIGINT NOT NULL REFERENCES product_option_values(id) ON DELETE CASCADE,
    PRIMARY KEY (variant_id, option_id)
);
CREATE INDEX product_variant_values_value_idx ON product_variant_values (value_id);
```

- `Product` is the aggregate: options and variants are saved with it, in
  one transaction. The domain keeps: at least one live variant; every
  variant has exactly one value per option; no two live variants share a
  combination; without options, exactly one variant. At most 3 options,
  50 values each, 100 variants. Staff send the whole `options` and
  `variants` lists: variants with an `id` are edited, without one added,
  and live ones left out are soft-deleted (orders keep pointing at them).
- `min_price` / `max_price` (from live variants' `list_price`) are
  rewritten on every save. Views compute `priceMin` / `priceMax` from the
  price now instead, and price sorts use each product's lowest price now.

- A variant's price now (`price` in the api) is computed, never stored: the
  sale price inside its window, else the list price. A stored copy would go
  stale when a window opens or closes.
- The shop shows `listPrice` struck through next to `price` while on sale,
  and never an upcoming sale (staff views add `sale` on the product, the
  window, and on each variant, the sale price as set).
- Only `active` products show in the shop and can be ordered.
- Images: `asset_usages` (`owner_type 'product'`, slots `folder`,
  `cover`, `inline`), like posts. `inline` follows the
  `/files/...` images in `content`, set on every save.
- Gallery: its own table, `ProductGalleryItem` (`productId`, `assetId`,
  `position`, optional `title` (255) and `description` (1000)), for a
  caption per image. Each asset once per product; blank captions are
  stored as null. `assetId` is RESTRICT like asset usages, so an image in a
  gallery can't be deleted (`asset_in_use`); deleting the product clears
  its gallery. Views return `gallery: [{ assetId, url, title,
  description }]`.
  - In the editor, new items can wait for an image (saving needs every
    item to have one). An image can be uploaded directly (a chosen,
    dropped or camera file, uploaded only on Save, so a discarded one
    leaves nothing behind), a link to an image hosted elsewhere (a `link`
    asset, nothing downloaded), or an existing library image. The cover
    is chosen the same way.
- Variant and option value images: one optional image each, as single-slot
  asset usages (`owner_type 'product_variant'` and
  `'product_option_value'`, slot `image`). A value image ("Color: Red")
  is shared by every variant with that value; a variant image overrides
  it for one combination.
  - The asset must be one of the product's photos (its `cover`,
    `gallery`, or a file directly in its folder), so the editor picks from the product's photos; otherwise
    `invalid_variant_image` (400).
  - Shown image, first that exists: the variant's `image`, then the image
    of its values in option `position` order, then the product `cover`.
    Computed in the query: `variants[].image` (its own) and
    `variants[].imageUrl` (what to show), `options[].images` (value ->
    image). Resolved URLs, never keys.
  - Deleting a variant or value (in the full save) deletes its asset usage
    in the same transaction; detaching an asset from the product clears
    the variant and value images that point at it.
  - New variants and values get an id only on save, so their images are
    set afterwards through `PUT /products/:id/images`.
- With `track_stock`, a variant's stock goes down when an order is placed (same
  transaction, refused below zero) and back up when it's cancelled. Turning
  tracking off keeps the number, so turning it back on resumes from it.
- Public views show `inStock` and `stock` only when tracked (else null);
  staff views always show the number.
- Public product views return `options` and `variants` (values by option
  name, `price`, `inStock`/`stock`), so the page picks the variant from the
  selected values; listings return `priceMin` / `priceMax`.
- `q` matches the name or a live variant's SKU. Errors: 409
  `product_slug_taken`, `sku_taken`; 404 `product_not_found`; 400
  `invalid_shop_input` (domain rules above).
- Api: `GET /shop/products?q=&categoryId=&sort=` (`sort`: `newest`
  (default), `price_asc`, `price_desc`, `name`) and
  `GET /shop/products/:slug` (public, active only); `GET /products` (same filters plus
  `status`), `GET /products/:id`, `POST /products`, `PATCH`, `DELETE /products/:id`,
  `PUT /products/:id/images { cover?, gallery?, variants?, optionValues? }`
  (`gallery`: the whole list in order, `[{ assetId, title?, description? }]`;
  `variants`: `{ [variantId]: assetId | null }`; `optionValues`:
  `[{ option, value, image }]`, by name since views don't expose value ids;
  only what is listed changes), `POST
  /products/:id/folder` (media picker scope) (editor, admin).
