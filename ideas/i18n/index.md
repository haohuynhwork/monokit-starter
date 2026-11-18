# Translations (i18n)

Content can be written in every active locale (`../geo`, `Locale`). The
existing columns of a post, page, product, category or tag hold the **default
locale's** text; every other locale gets an optional row in a
`<model>_translations` table. Reading in a locale takes the translation when
there is one and falls back to the default text otherwise, so a site with one
locale works exactly as before. Plan and status: `.work/locale-plan.md`.

## Tables

```sql
-- One per (post, non-default locale). Same text rules as posts.
CREATE TABLE post_translations (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_id     BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    -- RESTRICT: a locale with translations can't be deleted (deactivate it)
    locale_id   BIGINT NOT NULL REFERENCES locales(id) ON DELETE RESTRICT,
    title       VARCHAR(255) NOT NULL,
    -- NULL: use the post's own slug in this locale's path
    slug        VARCHAR(255),
    -- The path in this locale: each ancestor's slug in this locale (its
    -- translation's slug, else its own), joined by '/'. NULL while the post
    -- has no URL or is deleted. Written with posts.full_slug, same transaction.
    full_slug   VARCHAR(2048),
    content     TEXT NOT NULL DEFAULT '',
    description VARCHAR(500),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (post_id, locale_id)
);
-- No two posts share a path in one locale
CREATE UNIQUE INDEX ON post_translations (locale_id, full_slug) WHERE full_slug IS NOT NULL;

-- Same shape for pages; settings NULL = the page's own blocks
CREATE TABLE page_translations (... title, slug, full_slug, description, settings JSONB ...);

-- Products and categories: flat slugs, unique per locale
CREATE TABLE product_translations (... name, slug, description, content ...);
CREATE TABLE product_category_translations (... name, slug ...);
CREATE TABLE post_tag_translations (... name, slug ...);

-- The language of a user's emails and notifications; NULL = default locale
ALTER TABLE users ADD locale_id BIGINT REFERENCES locales(id) ON DELETE SET NULL;
```

## Rules

- **Default locale = base row.** There is never a translation row in the
  default locale; editing the default language edits the base row. Changing
  which locale is the default does not move text: the base row then simply
  reads as the new default (staff re-check it).
- **Fallback per item.** An item without a row in the requested locale is
  served in the default locale, at its default path. Responses say which
  locale was served (`locale`) and list the item's other versions
  (`alternates: [{ locale, path }]`) for hreflang and the language switcher.
- **Paths.** A translation's `slug` may be NULL: the item keeps its default
  slug in that locale. `full_slug` is recomputed with the base paths
  (`recomputePaths`), so a moved or renamed ancestor updates every locale.
  Posts and pages share one path space per locale (as they do now).
- **Soft delete.** Deleting a post/page clears its translations' `full_slug`
  so the path is free again; restoring recomputes it. Product/category/tag
  translation slugs stay reserved while the base row is soft-deleted.
- **Not translated:** order snapshots (`order_items.name`), page layouts,
  product gallery captions and option names (later, if needed).
- **Emails** use the recipient's `users.locale_id` (else the default); text
  lives in api message catalogs (`apps/api/src/common/i18n`). Notifications
  store type + data and are worded by the client in the viewer's locale.

## Routes

- Public reads take `?locale=<code>` (else `Accept-Language`, else default):
  `GET /public/posts/by-path?path=&locale=`, `/public/pages/by-path`,
  `/shop/products/:slug`, lists, menu, tags.
- Staff: `PUT /posts/:id/translations/:locale` (body: the translated fields),
  `DELETE /posts/:id/translations/:locale`; the same under `/pages`,
  `/shop/products`, `/shop/categories`, `/posts/tags`. The detail endpoints
  return `translations`.
- Web: the default locale is unprefixed (`/hello`); others are prefixed with
  the lower-case code (`/vi-vn/xin-chao`). `/en-us/...` for the default
  redirects to the bare URL.
