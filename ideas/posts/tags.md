# Post tags

Labels that cut across the post tree. The tree gives a post one place
(`/guides/travel/japan`); tags give it any number of groupings ("travel",
"review") that readers can browse at `/tags/<slug>`. They replace the old
`posts.keywords` array, which had no display name, no rename and no list of
all keywords with counts.

```sql
CREATE TABLE post_tags (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Shown as typed, e.g. 'Travel'
    name       VARCHAR(100) NOT NULL,
    -- URL name and identity: 'Travel' and 'travel ' are the same tag
    slug       VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX post_tags_slug_unique ON post_tags (slug);

CREATE TABLE post_taggings (
    post_id  BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id   BIGINT NOT NULL REFERENCES post_tags(id) ON DELETE CASCADE,
    -- Order on the post; the first tag is the primary one
    position INT NOT NULL DEFAULT 0,
    PRIMARY KEY (post_id, tag_id)
);
-- Posts with a tag
CREATE INDEX post_taggings_tag_idx ON post_taggings (tag_id);
```

- Hard delete, no `deleted_at`: a tag holds no content, and a soft-deleted
  one would only block its slug. Deleting it removes its taggings.
- Named `post_tags`, not `tags`, like `../orders/product-categories`; if
  products get tags they get their own table.
- Domain: `PostTag` is its own small aggregate. Name: trim, collapse
  whitespace, 1-100 chars, no `/`, `?` or `#`; slug: the name lowercased,
  spaces to `-`. Renaming changes the slug and refuses one another tag has
  (`post_tag_taken`). `Post` owns
  only its tag ids: `post.setTags(tagIds)` refuses duplicates and more than
  10 tags; the post repository rewrites its `post_taggings` rows in the same
  transaction as the post.
- `PATCH /posts/:id` takes `tags: string[]` (names; blanks and same-slug
  repeats dropped, then more than 10 refused). The handler resolves names by slug,
  creating missing tags first, in their own transaction, with
  `INSERT ... ON CONFLICT (slug) DO NOTHING` and a select, so two editors
  adding "travel" at once don't clash (a tag left unused by a failed save
  is harmless).
- Permissions follow `../users` roles: authors attach existing tags; only
  editors and admins create (by tagging; no create route), rename or delete
  tags (keeps near-duplicate spellings out).
- Counts are never stored: `postCount` counts live posts (not draft,
  `published_at <= now()`) in the query.
- Api: `GET /posts/tags?q=` (panel, signed in; all tags by name,
  `{ id, name, slug, postCount }`, `q` an `ILIKE` for autocomplete);
  `GET /public/posts/tags` (tags with live posts, no `id`);
  `GET /posts?tag=<slug>`, `GET /public/posts?tag=<slug>`; `PostView.tags`
  is `{ name, slug }[]` by position, loaded for the whole page of posts in
  one query. `PATCH /posts/tags/:id { name }`, `DELETE /posts/tags/:id`
  (editor, admin). Errors: `post_tag_not_found`, `post_tag_taken`.
- Migrating from `keywords`: create a tag per distinct keyword and a tagging
  per post/keyword pair, then drop the column and its GIN index.

## Open questions

- Merge (`POST /posts/tags/:id/merge { into }`) once the list gets messy?
- Tag pages need their own description / SEO text?
