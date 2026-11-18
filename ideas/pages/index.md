# Pages

A page is part of the site's structure: About, Contact, a landing page, "Our
shoes". Unlike a post (an article with a body of HTML, see `../posts`), a page
is an ordered list of blocks: a hero, rich text, a product grid, a contact
form. Editors build pages in the panel without a deploy.

Pages nest and get their URL like posts: `full_slug` is the path of slugs from
the root, and the tree works like `../storage` (`parent_id` is the source of
truth, `page_closure` is derived).

## Tables

```sql
-- Named, shared frames: template, header/footer style, sidebar blocks.
-- Editing one changes every page that uses it.
CREATE TABLE page_layouts (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    -- { version, template, width, header, footer, background, spacing,
    --   sidebar: { side, sticky, blocks[] } | null }; checked in the domain
    settings   JSONB NOT NULL,
    -- The layout for pages with no layout_id; exactly one (domain keeps it)
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT page_layouts_settings_is_object
        CHECK (jsonb_typeof(settings) = 'object'),
    CONSTRAINT page_layouts_default_live
        CHECK (NOT is_default OR deleted_at IS NULL)
);

-- Case-sensitive; a clash answers page_layout_name_taken
CREATE UNIQUE INDEX page_layouts_name_unique
    ON page_layouts (name) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX page_layouts_one_default
    ON page_layouts (is_default) WHERE is_default;

CREATE TABLE pages (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id    BIGINT REFERENCES pages(id) ON DELETE RESTRICT,
    author_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    -- Shared frame (see Layout); NULL means the default layout
    layout_id    BIGINT REFERENCES page_layouts(id) ON DELETE RESTRICT,

    title        VARCHAR(255) NOT NULL,
    -- Same rules as posts.slug / posts.full_slug
    slug         VARCHAR(255),
    full_slug    VARCHAR(2048),
    -- <meta name="description"> / og:description
    description  VARCHAR(500),
    -- Everything the editor builds, saved as one snapshot:
    -- { version, <page options>, blocks: [{ id, type, props }] }.
    -- Shape checked in the domain (see Settings, Blocks).
    -- No column default: the domain always writes it
    settings     JSONB NOT NULL,

    status       TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'scheduled', 'published')),
    published_at TIMESTAMPTZ,

    -- Site header menu; order among siblings
    show_in_menu BOOLEAN NOT NULL DEFAULT false,
    menu_order   INT NOT NULL DEFAULT 0,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ,

    CONSTRAINT pages_slug_not_blank
        CHECK (slug IS NULL OR (slug = btrim(slug) AND slug <> '')),
    CONSTRAINT pages_live_has_url CHECK (
        status = 'draft' OR (full_slug IS NOT NULL AND published_at IS NOT NULL)
    ),
    CONSTRAINT pages_settings_shape CHECK (
        jsonb_typeof(settings) = 'object'
        AND jsonb_typeof(settings->'blocks') = 'array'
    )
);

CREATE UNIQUE INDEX pages_full_slug_unique
    ON pages (full_slug)
    WHERE full_slug IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX ON pages (parent_id);
CREATE INDEX ON pages (author_id);
CREATE INDEX ON pages (layout_id);

-- Every ancestor/descendant pair, each page with itself at depth 0;
-- same upkeep as post_closure
CREATE TABLE page_closure (
    ancestor_id   BIGINT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    descendant_id BIGINT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    depth         INT NOT NULL CONSTRAINT page_closure_depth CHECK (depth >= 0),
    PRIMARY KEY (ancestor_id, descendant_id)
);
CREATE INDEX ON page_closure (descendant_id, depth);
```

## One URL namespace

Pages and posts both resolve at `/<full_slug>` through the site catch-all.
Lookup order: page, then post. A page and a live post must not share a path:
setting a page's slug or parent (or a post's) asks the other context through
a query (`IsPostPathTakenQuery` / `IsPagePathTakenQuery`) and refuses with
`path_taken`. Only the item's own new path is checked, not the paths below
it. The unique indexes only guard each table; a clash the check misses (a
race, a descendant) is accepted, and the page wins at lookup.

Reserved first segments are refused for pages and posts (`reserved_path`,
`common/domain/paths.ts`): `panel`, `login`, `register`, `logout`, `posts`,
`tags`, `products`, `orders`, `account`, `files`, `api`, `_next`.

## Blocks

`settings.blocks` is a list of `{ id, type, props }`. `id` is a client-made random
string (1..40 of `A-Za-z0-9_-`, unique in the list), stable across edits
(keys in React, anchors). Known types and their
props are code (`pages/domain/block-types.ts`), like `CONFIG_KEYS` in
`../configs`; unknown types are refused.

| type          | props                                                                                                                                                                  | renders                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `richText`    | `html`                                                                                                                                                                 | prose, sanitized like post content                      |
| `hero`        | `title`, `subtitle?`, `imageKey?`, `cta? {label, href}` (`href`: `/path`, `https://` or `mailto:`)                                                                     | banner; not in columns or sidebars                      |
| `image`       | `assetKey`, `alt`, `caption?`                                                                                                                                          | one image                                               |
| `gallery`     | `assetKeys[]` (1..48)                                                                                                                                                  | grid of images                                          |
| `productGrid` | `productCategoryId?` (`../orders/product-categories`; that category only, none = all), `limit` (1..48, max 8 in a sidebar), `sort` (`newest`, `priceAsc`, `priceDesc`) | products, queried at render                             |
| `postList`    | `tagId?` (`../posts/tags`), `limit` (1..24)                                                                                                                            | latest published posts                                  |
| `contactForm` | `title?`, `fields[]` (`name`, `email`, `phone`, `subject`, `message`; no duplicates, `email` or `phone` required), `to?` (email)                                       | form posting to `POST /public/contact`; not in sidebars |
| `faq`         | `items[] {question, answer}` (1..50)                                                                                                                                   | accordion                                               |
| `columns`     | `columns[] { blocks[] }` (2..4)                                                                                                                                        | side-by-side blocks; not in columns or sidebars         |
- Blocks store options (ids, limits), never copies: a `productGrid` shows current products
  and prices. A `productGrid` whose product category was deleted renders
  nothing. It reads through the shop's queries, never its tables.
- Unknown props are dropped; `richText` html is sanitized before saving.
- Max 100 blocks per page (30 in a layout sidebar), 500 KB of `settings` JSON.
- Bad blocks, options or overrides answer `invalid_page` naming the first
  problem (`invalid_page_layout` for layouts).
- A new type is a check in `block-types.ts`, a form in the panel and a
  component in the site's block renderer.

## Settings

One column holds the whole page as the editor builds it:

```json
{
  "version": 1,
  "layout": {
    "width": "wide",
    "header": "transparent"
  },
  "showTitle": false,
  "seo.noindex": false,
  "blocks": [
    {
      "id": "k3f9",
      "type": "hero",
      "props": {
        "title": "About us"
      }
    },
    {
      "id": "p2x1",
      "type": "richText",
      "props": {
        "html": "<p>…</p>"
      }
    }
  ]
}
```

- One column, because blocks and options are edited and saved together: a
  revision is one snapshot, restoring it one write.
- `version` is the format; when blocks or options change shape, the domain
  upgrades old values on read and saves the new version on the next write.
- What SQL must enforce or look up stays in real columns (`slug`,
  `full_slug`, `status`, `published_at`, menu fields, `deleted_at`, `title`,
  `description`), never in `settings`.

### Page options

Besides `version`, `layout` and `blocks`, the keys are whole-page options: no order,
one of each. Known keys, their defaults and checks are code
(`pages/domain/page-settings.ts`), like `CONFIG_KEYS` in `../configs`;
unknown keys are refused, a missing key means the default.

| key                | type                     | default | use                                              |
| ------------------ | ------------------------ | ------- | ------------------------------------------------ |
| `showTitle`        | bool                     | `true`  | `<h1>` from `title` (off when a hero carries it) |
| `seo.title`        | text, max 70, or null    | `null`  | `<title>` when it must differ from `title`       |
| `seo.imageKey`     | public asset key or null | `null`  | `og:image`; fallback: first hero/image block     |
| `seo.noindex`      | bool                     | `false` | `<meta name="robots" content="noindex">`         |
| `cache.revalidate` | int seconds, 0..86400    | `300`   | stored only, not used yet                        |
- Sent and saved whole with the page (`PATCH /pages/:id` `{ settings }`);
  `null` for an option resets it to the default.
- Resolved as page value, then code default (no site-config inheritance).
- Values are options to pick, not free CSS or scripts: the site renders them
  with its own components, so a page can't break the theme or inject code.
- `seo.imageKey` counts as a use of the asset (see Files).
- Block-level options stay in the block's `props` (e.g. a hero's height);
  only what affects the whole page goes here.

### Layout

A layout is how a page is framed around its blocks. Layouts are rows in
`page_layouts`, shared by name ("Default", "Shop", "Blog with sidebar",
"Landing"); a page picks one with `layout_id` and may override a few fields
in `settings.layout`. Checked in `pages/domain/page-layout.ts`.

| field        | values                                                  | default   | page may override | use                                                              |
| ------------ | ------------------------------------------------------- | --------- | :---------------: | ---------------------------------------------------------------- |
| `template`   | `default`, `landing`, `sidebar`, `blank`                | `default` |        no         | frame, see below                                                 |
| `width`      | `narrow`, `wide`, `full`                                | `narrow`  |        yes        | main column width                                                |
| `header`     | `default`, `transparent`, `minimal`, `none`             | `default` |        yes        | site header style; `transparent` overlays the first block (hero) |
| `footer`     | `default`, `minimal`, `none`                            | `default` |        yes        | site footer style                                                |
| `background` | `default`, `muted`, `primary`                           | `default` |        yes        | theme token, never raw colors                                    |
| `spacing`    | `compact`, `normal`, `relaxed`                          | `normal`  |        yes        | gap between blocks                                               |
| `sidebar`    | `{ side: left\|right, sticky: bool, blocks[] }` or null | `null`    |        no         | only with `template: sidebar`                                    |

Each field resolves: page override (`settings.layout`), then the page's
layout (`layout_id`, or the default layout), then the code default.
`template` and `sidebar` are never per page: they are what the layout is
shared for. A page wanting another frame picks another layout.

Templates:
- `default`: header, title, blocks in the main column, footer.
- `landing`: no title, blocks run full width edge to edge, each block keeps
  its own inner width (`width` ignored); for home and campaign pages.
- `sidebar`: main column plus `sidebar.blocks` beside it (stacked below on
  phones). Sidebar blocks use the same types and checks as page blocks, but
  not `columns`, `hero`, `contactForm` (its messages are looked up on the
  page) or `productGrid` with `limit` > 8.
- A page's `settings.layout` may only hold `width`, `header`, `footer`,
  `background`, `spacing`; anything else is refused.
- `blank`: no header, footer or title; just blocks (print views, embeds).

Rules:
- Exactly one live default layout. Seeding creates "Default"; making
  another the default unsets the old one in the same transaction. The
  default can't be deleted (`layout_is_default`).
- Deleting a layout is refused while live pages use it (`layout_in_use`).
- `sidebar` without `template: sidebar` is refused
  (`sidebar_needs_template`). The panel keeps the sidebar while you switch
  templates, but drops it when saving another template. Templates ignore the
  other fields they don't use.
- Layout sidebar blocks are tracked as uses of their assets
  (`owner_type = 'page_layout'`), max 30 blocks.
- Page revisions snapshot `settings` and `layout_id`, not the layout
  itself: restoring a page shows today's version of its layout.
- A new template is a check in `page-layout.ts` and a frame component in
  the site's `<PageFrame>`; blocks don't know which template they're in.

## Files

Like posts: files live in the media library and link through
`asset_usages` (`owner_type = 'page'`). Saving collects every asset key
in `settings` (blocks: image, gallery, hero, `/files/<key>` in rich text,
`seo.imageKey`) and makes the `inline` asset usages match
(`SetAssetUsagesCommand`, after the page save, not in its transaction), so a
file used on a page can't be deleted (`asset_in_use`). Unknown or private
keys are refused on save (`unknown_files_in_page`); publishing is refused
while a private asset is attached (`private_files_in_page`).

## Contact form

`POST /public/contact` `{ pageId, blockId, fields, website }` (204): the api
loads the live page, finds the `contactForm` block (also inside `columns`;
else `contact_form_not_found`), checks the fields it lists (email or phone
required, `message` required when listed, `subject` one line of at most
255 characters; `invalid_contact_message`), and hands it to the contact
context (`SubmitContactMessageCommand`), which stores it for the panel inbox
and mails it (`../contact/index.md`). `website` is a honeypot: when filled,
the api answers as if sent and stores nothing.

Rate limit: the api allows 5 messages per 10 minutes per `req.ip`
(`@RateLimit`, `common/http/guards/rate-limit.ts`, 429 past it). The web contact
action forwards the visitor's address as `X-Forwarded-For` (`visitorIp`,
`PROXY_HOPS`), and `TRUST_PROXY` makes the api use it. Counts are in
memory, per process.

## Api

- `GET /pages` (editor): tree with status, no settings.
- `GET /pages/:id` (editor): one page with settings, drafts included.
- `POST /pages` `{ title, parentId?, layoutId? }` (always a draft),
  `PATCH /pages/:id` (title, slug, description, settings, `layoutId`,
  `showInMenu`, `menuOrder`), `POST /pages/:id/publish` `{ at? }` (future
  `at` = scheduled), `POST /pages/:id/unpublish`, `POST /pages/:id/move`
  `{ parentId }`, `DELETE /pages/:id`.
- `GET /public/pages/by-path?path=a/b` (public): a live page, layout and
  options resolved.
- `GET /page-layouts` (with `pageCount`), `GET /page-layouts/:id`, `POST /page-layouts`, `PATCH /page-layouts/:id`
  (name, settings), `POST /page-layouts/:id/default`,
  `DELETE /page-layouts/:id` (editor).
- `GET /public/pages/menu` (public): live pages with `show_in_menu`, each
  under its nearest ancestor that is also in the menu, ordered by
  `menu_order`.

## Web

- Panel `/panel/pages`: the page tree, with status, layout and menu badges.
  The editor has the block list on the left: add, move up or down,
  duplicate, delete, each block with its own form. The right column holds
  status (save, publish, unpublish, delete), page fields (slug, parent,
  description, menu), layout (pick one plus per-page overrides) and SEO.
  "New page" (`createPage` action) creates a draft at once (`POST /pages`,
  title from the form or "Untitled") and opens its editor.
  `/panel/pages/layouts`: the layouts. Their editor picks the template from
  wireframe thumbnails, edits the frame fields and sidebar blocks, and shows
  how many pages use it.
- Site `[...path]`: page first, then post. `<PageFrame>` applies the
  resolved layout around `<BlockList>`, which maps `type` to a server
  component. Data blocks (`productGrid`, `postList`) fetch their own data.
  The header and footer stay in `(site)/layout.tsx`; a page restyles them
  with CSS on their `data-site-*` attributes. The header menu and footer
  links come from `GET /public/pages/menu`.
- Public pages and the menu are cached like public posts (`cacheLife
  ("minutes")`, tag `public-pages`, refreshed by the panel's actions).
  `cache.revalidate` is stored but not used yet.
- The hard-coded `/about` and `/contact` routes are gone; seeding creates
  the Default layout and About and Contact pages through the `CommandBus`
  (skipped when the path is taken).
- The panel pages check the role too (`staff.tsx`) and show a notice to
  authors.

## Not built yet

- Drag to reorder blocks (buttons for now) and a draft preview.
- `cache.revalidate` (stored, unused).
- `productGrid` with subcategories (needs a shop list filter).
- Asset usages in the same transaction as the page save (same gap as posts).
- Panel warning when a `productGrid` category was deleted.

## Notes

- Permissions follow `../users` roles: `@Roles('admin', 'editor')` on
  `/pages` and `/page-layouts`; authors can't (pages are site structure).
  `/public/*` is `@Public()`.
- Publishing needs a slug on the page and every parent
  (`page_not_reachable`); a live page can't drop its slug
  (`live_page_needs_slug`, `live_descendant_needs_path`). Moving under
  itself or a child: `move_page_into_itself`. Missing rows: `page_not_found`,
  `page_layout_not_found`.
- No domain events: pages talk to storage, mail, configs and posts through
  commands and queries only.
- Scheduled pages go live like posts: readers filter
  `status = 'published' AND published_at <= now()`.
- Delete: soft, refused while it has non-deleted children (`page_has_children`);
  then detaches its asset usages (`DetachAssetsCommand`, a separate command
  after the save); the files stay in the library.
- Pages vs posts: if both end up the same shape, posts could become pages
  with a single `richText` block. Keep them apart until then; they differ in
  listing, tags, authorship and menu.

## Open questions

- Revisions: a `page_revisions` history of `settings`, so an editor can undo a
  bad publish?
- Reusable blocks (a footer CTA used on many pages): a `blocks` table
  referenced by `{ type: 'ref', props: { blockId } }`?
- Home page: a page with `full_slug = ''`, or a `site.homePageId` config?
