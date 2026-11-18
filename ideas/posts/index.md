# Posts

A post is a page of content. Posts nest: a post can have a parent, and its
URL is the path of slugs from the root, e.g. `a1/a2/b1/b2` for post 2 under
post 1 (`a1/a2`). The tree works like `../storage`: `parent_id` is the source
of truth, `post_closure` is derived from it for fast tree reads.

## Tables

```sql
CREATE TABLE posts (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Source of truth for the tree; post_closure is derived from it.
    -- Change both in one transaction.
    parent_id    BIGINT REFERENCES posts(id) ON DELETE RESTRICT,
    author_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,

    title        VARCHAR(255) NOT NULL,
    -- URL name. NULL while the post has no URL yet (a new draft). May
    -- contain '/', e.g. 'a1/a2'. Unique only through full_slug.
    slug         VARCHAR(255),
    -- Slugs of all ancestors and self joined by '/'. NULL when this post or
    -- any ancestor has no slug. Lookup by path only: never split or
    -- prefix-match it; use post_closure.
    full_slug    VARCHAR(2048),
    content      TEXT NOT NULL DEFAULT '',
    -- Short summary: the excerpt in listings and the <meta name="description">
    -- / og:description for search results and link previews (~160 chars
    -- show; longer is cut off)
    description  VARCHAR(500),
    -- Tags live in post_tags / post_taggings (tags.md)

    status       TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'scheduled', 'published')),
    -- When it goes or went live; required unless draft
    published_at TIMESTAMPTZ,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Soft delete; NULL means the post exists
    deleted_at   TIMESTAMPTZ,

    CONSTRAINT posts_slug_not_blank
        CHECK (slug IS NULL OR (slug = btrim(slug) AND slug <> '')),
    -- A published or scheduled post must be reachable and dated
    CONSTRAINT posts_live_has_url CHECK (
        status = 'draft' OR (full_slug IS NOT NULL AND published_at IS NOT NULL)
    )
);

-- The only uniqueness rule: no two live posts share a path. It covers
-- siblings with the same slug (same path) and paths that coincide because
-- slugs may contain '/' (root slug 'a1/a2' vs post 'a2' under 'a1'). Posts
-- without a path (no slug here or above) don't clash until they get one.
CREATE UNIQUE INDEX posts_full_slug_unique
    ON posts (full_slug)
    WHERE full_slug IS NOT NULL AND deleted_at IS NULL;

-- Children of a post / posts of a user; the FKs need them too
CREATE INDEX posts_parent_idx ON posts (parent_id);
CREATE INDEX posts_author_idx ON posts (author_id);
-- Published listings, newest first
CREATE INDEX posts_published_idx
    ON posts (published_at DESC)
    WHERE status = 'published' AND deleted_at IS NULL;
-- Panel search (`GET /posts?q=`, websearch_to_tsquery); title weighs more
CREATE INDEX posts_search ON posts USING gin (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
);

-- Every ancestor/descendant pair, including each post with itself (depth 0)
CREATE TABLE post_closure (
    descendant_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    ancestor_id   BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    depth         INT NOT NULL CHECK (depth >= 0),

    PRIMARY KEY (ancestor_id, descendant_id)
);

-- Breadcrumbs; the PK covers subtrees
CREATE INDEX post_closure_descendant_idx ON post_closure (descendant_id, depth);
```

Files: see [Files](#files) below.

### Example rows

|  id | parent_id | slug  | full_slug         | status    |
| --: | --------: | ----- | ----------------- | --------- |
|   1 |           | a1/a2 | a1/a2             | published |
|   2 |         1 | b1/b2 | a1/a2/b1/b2       | published |
|   3 |         2 | c1/c2 | a1/a2/b1/b2/c1/c2 | draft     |
|   4 |           |       |                   | draft     |

`post_closure` for post 3, as `(ancestor, descendant, depth)`:
`(1,3,2) (2,3,1) (3,3,0)`.

## Scenarios

### Create

- `POST /posts { title, parentId }` makes a draft with no slug; slug, content,
  description and tags come with `PATCH /posts/:id`.
- `slug` may be NULL (a draft with no URL yet); then `full_slug` is NULL.
- Otherwise `full_slug = parent.full_slug || '/' || slug` (or just `slug` at
  the root); NULL if the parent has no `full_slug`.
- Insert the closure rows: the parent's ancestor rows with `depth + 1`, plus
  the self row.

### Set or change a slug

1. New `full_slug` for the post and every descendant: swap the old prefix for
   the new one, finding descendants through `post_closure` (never `LIKE`).
2. Any clash, a sibling's or another post's, or one that appears only now
   because a parent got its slug: rejected by `posts_full_slug_unique`;
   report "path taken" and roll back.

- `toSlug`: trim, lowercase, whitespace runs to `-`, collapse `--`, strip
  leading/trailing `-` and `/`; 1-255 chars, no control chars, `?` or `#`.
- A live post can't drop its slug (`live_post_needs_slug`), and a change
  that would leave a live descendant without a `full_slug` is refused
  (`posts_live_has_url` -> `live_descendant_needs_path`): unpublish first.
- The post's own new path is also checked against reserved first segments
  and page paths (`../pages`, one URL namespace); paths below it are not.
  Moves get the same check.

All in one transaction.

### Move to another parent (e.g. post 1 under a3)

1. Refuse when the new parent is the post or one of its descendants
   (closure row `ancestor = post, descendant = new parent`).
2. Delete closure links from the old ancestors to the subtree (keep links
   inside it), then link every new ancestor to every subtree node with
   depths added.
3. Update `parent_id`, then `full_slug` as above.

### Publish / unpublish

- `POST /posts/:id/publish { at? }`: refused unless the post has a slug and
  its parent a `full_slug` (`post_not_reachable`), or while a private file is
  attached (`private_files_in_post`). `at` in the future makes it
  `scheduled`, otherwise `published`; `published_at = at ?? now`.
- Going live now raises `PostPublishedEvent { postId, title, path, actorId }`
  after the commit (notifications listen). Scheduled posts raise none yet.
- `POST /posts/:id/unpublish`: back to `draft`, `published_at` NULL.

### Find by path

`WHERE full_slug = 'a1/a2/b1/b2' AND deleted_at IS NULL`. Old paths stop
working after a rename or move.

### Delete

- Soft delete (`deleted_at`). Refuse while it has non-deleted children
  (`post_has_children`; `ON DELETE RESTRICT` guards hard deletes too).
- Then detach its `asset_usages` rows (a separate command after the
  save, not yet the same transaction).

## Files

Posts store no files. Files live in the media library (`assets`, see
`../storage`) and are linked with `asset_usages` rows
(`owner_type = 'post'`):

| slot   | kind        | use                                  |
| ------ | ----------- | ------------------------------------ |
| cover  | single slot | header image; `og:image` in previews |
| inline | list        | images placed inside `content`       |

Cover: `PUT /posts/:id/cover { assetId | null }`.
- `content` is HTML from the TinyMCE editor, sanitized by the api (allowlist:
  no scripts, event handlers, iframes or styles except alignment) because
  public pages render it as is.
- Images in `content` are `<img src="/files/<key>">` URLs of public assets.
  Editor uploads (inline and cover) go to the post's own folder, created on
  first use by `POST /posts/:id/folder`. Storage keys never change, so the URLs stay valid. Saving finds those keys and makes
  the `inline` asset usages match, so "where is this file used" stays right
  and a file shown in a post can't be deleted (`asset_in_use`). The sync
  runs after the save, not yet in its transaction. External
  https images are allowed but not tracked.
- A published post shows only public files: publishing is refused while a
  private asset is attached, with a message naming it. Nothing becomes public
  without someone choosing it.
- Deleting a post detaches its rows; the files stay in the library, since
  other posts may use them. A replaced cover stays too.
- Whoever may edit the post may attach files to it, from any folder.

## Api

Panel (signed in): `GET /posts` (`q`, `status`, `tag`, `limit` <= 100,
`offset`; paginated summaries), `GET /posts/options` (all posts `{ id,
title, path }` for parent pickers), `GET /posts/:id`, `POST /posts`,
`PATCH /posts/:id`, `POST /posts/:id/move { parentId }`,
`POST /posts/:id/publish`, `POST /posts/:id/unpublish`,
`PUT /posts/:id/cover`, `POST /posts/:id/folder`, `DELETE /posts/:id`.

Public (no sign-in, live posts only): `GET /public/posts` (latest, `limit`
<= 50, `offset`, `tag` slug or `tagId`, `q` full-text search with best
matches first), `GET /public/posts/by-path?path=`,
`GET /public/posts/tags`; the same reads over GraphQL.

Errors: `post_not_found`, `invalid_post`, `path_taken`, `post_not_reachable`,
`live_post_needs_slug`, `live_descendant_needs_path`,
`private_files_in_post`, `post_has_children`, `move_post_into_itself`,
`post_forbidden`.

## Notes

- Publishing: `scheduled` posts go live when `published_at` passes; readers
  filter `status <> 'draft' AND published_at <= now()`, so no job is needed
  to flip the status (it stays `scheduled`).
- A published post under a draft parent is still reachable by path; decide
  whether readers must also require every ancestor to be published.
- SEO: the page `<title>` is `title`, the description is `description`
  (fallback: the start of `content`), the preview image is the `cover`
  asset usage. Add separate `meta_title` / `meta_description` only if editors
  need them to differ from what readers see.
- Tags: see `tags.md`. They replaced a `keywords TEXT[]` column once tags
  needed their own pages, renames and counts.
- Permissions follow `../users` roles: anyone signed in writes drafts;
  authors edit, move and delete their own posts (`author_id`), editors and
  admins any; only editors and admins publish and unpublish.

## Not built yet

- `gallery` (ordered images) and `download` (ordered files) slots.
- Detaching / syncing asset usages in the post's own transaction.
- SEO description falling back to the start of `content`.
- `PostPublishedEvent` when a scheduled post's time passes.

## Open questions

- Revisions: keep a `post_revisions` history of `title`/`content`?
- Should `slug` be generated from `title` when publishing without one?
