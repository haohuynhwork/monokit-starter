# Storage

Assets (files and directories) live in Postgres. File bytes live in a storage
backend (S3, local disk, GCS, ...) behind one `Storage` interface. The database
is the source of truth for names, folders and visibility; the backend only
stores bytes under an opaque key.

## Files in other domains

Strongly prefer the asset storage for files other domains use: an asset attached
through `asset_usages` (a post's `cover`, a user's `avatar`, a product's
`gallery`), and a `link` asset for an image hosted elsewhere, rather than
file, key or URL columns of their own. That keeps one URL resolver
(responses get ready-to-use URLs, whatever the backend), one media library,
one answer to "where is this file used" (delete and visibility checks), and
backend moves inside storage. A column of its own is fine when the value
isn't really a file the site manages (e.g. a URL that is only a link), but
say why.

## Image slots in the panel

Suggested design for an image an editor sets (a cover, a gallery item):

- With an image: the image itself, with two small round buttons side by
  side overlapping its top-right corner: Replace (a menu: Upload, Camera,
  Link, From library) then × (remove). Clicking the image opens it full
  size.
- Without one: a dashed slot ("Add image", "or drop an image here")
  opening the same menu. An image file can also be dropped on the slot or
  on the image.
- Changes wait for the card's Save. A new image shows at once with an
  "Unsaved" badge (a chosen file from a local preview, uploaded only on
  Save); × on it discards it. × on the saved image dims it and turns into
  Restore until Save.

## Storage interface

The api is NestJS, so the interface is TypeScript, shaped like a
[`@nestjs/storage`](https://docs.nestjs.com/application/file-storage) disk so
an S3 backend can wrap `S3Disk`. Cancellation uses an `AbortSignal`. Code:
`apps/api/src/storage/domain/storage.ts`.

```typescript
type StorageBody = Buffer | Uint8Array | string | Readable | AsyncIterable<Uint8Array>;

interface PutOptions {
  contentType?: string;          // default: from the extension
  cacheControl?: string;
  contentDisposition?: string;
  metadata?: Record<string, string>; // at most 2 KB
  contentLength?: number;        // a body of another length is refused
  signal?: AbortSignal;
}

interface ObjectInfo {
  key: string;
  size: number;
  contentType?: string;
  cacheControl?: string;
  contentDisposition?: string;
  metadata?: Record<string, string>;
  lastModified: Date;
  etag: string;
}

interface Storage {
  readonly name: string;         // stored on each asset, e.g. 'local'
  put(key, body, opts?): Promise<ObjectInfo>;      // atomic, replaces
  get(key, { range?, signal? }?): Promise<ObjectInfo & { body: Readable }>;
  getBuffer(key): Promise<Buffer>;
  getText(key): Promise<string>;
  stat(key): Promise<ObjectInfo>;
  exists(key): Promise<boolean>;
  delete(keys: string | string[]): Promise<void>;  // missing keys are fine
  list({ prefix?, cursor?, limit? }?): Promise<{ items: ObjectInfo[]; cursor: string | null }>;
  listAll({ prefix?, limit? }?): AsyncIterable<ObjectInfo>;
  copy(from, to): Promise<void>;                   // metadata included
  move(from, to): Promise<void>;
  url(key): Promise<string>;                       // public URL
  signedUrl(key, { expiresIn?, filename?, disposition? }?): Promise<string>;
  signedUpload(key, { contentType, contentLength?, expiresIn? }):
    Promise<{ url: string; method: 'PUT'; headers: Record<string, string>; expiresAt: Date }>;
}
```

- Keys: relative, `/`-separated, at most 1024 UTF-8 bytes; no empty, `.` or
  `..` segments, backslashes or control characters.
- `get` / `stat` / `copy` / `move` throw `StoredObjectNotFoundError` on a
  missing key, so callers can't forget the check.
- Signed links default to 15 minutes, at most 7 days. A download link pins
  the key, filename and disposition; an upload link pins the key, content
  type and length. Whoever holds one may use it until it expires, like an S3
  presigned URL, so it's for handing out one object, not for access control.
- Implementations: `LocalStorage` (dev), `S3Storage` (prod, also MinIO/R2;
  not built yet, would wrap `S3Disk`).

### Local backend

- Files under `STORAGE_DIR`; what a file can't hold itself (content type,
  cache control, disposition, metadata) goes in a sidecar
  `.meta/<key>.json`. `.tmp/` holds writes in progress. Both are reserved
  and never listed.
- Signed links are api routes, `GET` / `PUT /storage/<key>?...&expires&kid&signature`
  (`StorageLinksController`, forwarded by the web app like `/files`).
  HMAC-SHA256 over the method, key, pinned fields and expiry, with a key
  derived from `APP_SECRET` (label `storage-link-hmac`); `APP_SECRET_PREVIOUS`
  still verifies while rotating. Refusals: `403` bad or expired link (or the
  wrong method), `415` another content type, `400` another length.

## Tables

```sql
CREATE TABLE assets (
    id            BIGSERIAL PRIMARY KEY,
    -- Source of truth for the tree (one parent, subtree delete via CASCADE);
    -- assets_closure is derived from it. Change both in one transaction.
    parent_id     BIGINT REFERENCES assets(id) ON DELETE CASCADE,

    kind          TEXT NOT NULL DEFAULT 'file'
                  CHECK (kind IN ('file', 'directory', 'link')),
    visibility    TEXT NOT NULL DEFAULT 'private'
                  CHECK (visibility IN ('public', 'private')),

    -- Public, permanent, unique across backends: random '{uuid}.{ext}' for
    -- files, '{uuid}' for directories and links. Rich text references any
    -- asset as 'serve/{key}'. Not the storage key, which only the backend uses.
    key           VARCHAR(1024) NOT NULL,

    -- URL name, unique within the parent folder. May contain '/', so a
    -- path does not show where folder boundaries are.
    slug          VARCHAR(255) NOT NULL,
    -- Slugs of all ancestors and self joined by '/' (e.g. 'images/logo').
    -- A lookup key for "find by path" only: never split it or prefix-match
    -- it (LIKE 'a/%') for tree queries; use assets_closure. Rewritten for
    -- the whole subtree on rename/move, using assets_closure to find them.
    full_slug     VARCHAR(2048) NOT NULL,
    -- Original name shown to users and used for downloads
    filename      VARCHAR(255) NOT NULL,

    -- File-only columns (see assets_kind_columns)
    mime_type     VARCHAR(255),
    size_bytes    BIGINT,
    -- Configured backend name (e.g. 'local', 's3-prod'), not the provider type
    storage       VARCHAR(64),
    -- File-only: opaque object key in that backend; never derived from slug
    -- or filename. Unique per backend only (1024: S3's limit).
    storage_key   VARCHAR(1024),
    -- Hex SHA-256 of the content
    checksum      VARCHAR(64),

    -- Link-only: absolute http(s) URL of an external resource
    url           VARCHAR(2048),

    -- Who created it; kept (as NULL) when the user is deleted. NULL also for
    -- system folders (entity and type folders).
    created_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),  -- set on every update

    CONSTRAINT assets_key_unique UNIQUE (key),
    CONSTRAINT assets_storage_key_unique UNIQUE (storage, storage_key),
    -- Not implied by the parent/slug index, since slugs may contain '/':
    -- root slug 'a/b' and file 'b' in folder 'a' would share a path.
    -- Rejecting that keeps lookup by path unambiguous; also indexes it.
    CONSTRAINT assets_full_slug_unique UNIQUE (full_slug),

    -- Each kind has exactly its own columns
    CONSTRAINT assets_kind_columns CHECK (CASE kind
        WHEN 'file' THEN storage IS NOT NULL AND storage_key IS NOT NULL
            AND mime_type IS NOT NULL AND size_bytes IS NOT NULL
            AND size_bytes >= 0 AND checksum IS NOT NULL AND url IS NULL
        WHEN 'link' THEN url IS NOT NULL AND storage IS NULL AND storage_key IS NULL
        ELSE storage IS NULL AND storage_key IS NULL AND url IS NULL
            AND mime_type IS NULL AND size_bytes IS NULL
    END),
    CONSTRAINT assets_slug_not_blank CHECK (slug <> '' AND slug = btrim(slug))
);

-- Siblings have distinct slugs. COALESCE makes root-level slugs unique too
-- (Prisma 8 has no NULLS NOT DISTINCT); ids start at 1, so 0 is free.
CREATE UNIQUE INDEX assets_parent_slug_unique
    ON assets (COALESCE(parent_id, 0), slug);
-- Direct children; the expression index above can't serve parent_id = :id
CREATE INDEX ON assets (parent_id);
CREATE INDEX ON assets (created_by_id);

-- Every ancestor/descendant pair, including each asset with itself (depth 0).
CREATE TABLE assets_closure (
    descendant_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    ancestor_id   BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    depth         INT NOT NULL,

    PRIMARY KEY (ancestor_id, descendant_id),
    CONSTRAINT asset_closure_depth CHECK (depth >= 0)
);

-- "Which folders contain this asset" (breadcrumbs); the PK covers subtrees.
CREATE INDEX ON assets_closure (descendant_id, depth);

-- Where an asset is used: single slots (a user's avatar, a post's cover)
-- and ordered lists (a gallery, downloads). Many-to-many: one asset can be
-- used by many owners. Records only the use itself, no per-use data
-- (captions etc. live in a typed table, such as shop's ProductGalleryItem).
-- Polymorphic, so no FK on the owner side: delete usages with the owner.
-- RESTRICT on asset_id: a used asset can't be deleted until detached.
CREATE TABLE asset_usages (
    id          BIGSERIAL PRIMARY KEY,
    asset_id    BIGINT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    owner_type  VARCHAR(64) NOT NULL,
    owner_id    BIGINT NOT NULL,
    -- What the asset is for on this owner ('avatar', 'gallery', ...);
    -- allowed values per owner_type are checked in the domain
    slot        VARCHAR(64) NOT NULL,
    -- Order within (owner, slot); gaps are fine
    position    INT NOT NULL DEFAULT 0,

    -- Stops the same asset appearing twice in one list
    UNIQUE (owner_type, owner_id, slot, asset_id)
);

-- Single slots (one asset per owner) are enforced in the domain only, not
-- by an index: attaching to a single slot replaces the existing row.

-- "Where is this asset used" (delete checks, private-usage checks)
CREATE INDEX ON asset_usages (asset_id);
```

In the code the tables are the models `Asset`, `AssetClosure`,
`AssetUsage` (camelCase columns, per AGENTS.md; contract
`packages/db/src/prisma/contracts/asset.prisma`). Unnamed indexes get
Prisma's generated names.

Indexes:
- `UNIQUE (key)`, `UNIQUE (storage, storage_key)`, `UNIQUE (full_slug)` and the
  usages unique already create indexes.
- `parent_id` needs its own index: the parent/slug index is on an
  expression, `COALESCE(parent_id, 0)`, which `parent_id = :id` can't use.
- The usages unique serves "assets of this owner and slot";
  ordering by `position` sorts only that small slice.

### Closure table

`assets_closure` stores every ancestor/descendant pair, so tree reads are one
indexed query instead of `WITH RECURSIVE` over `parent_id`. `full_slug`
can't stand in for it: slugs may contain `/`, so a prefix match like
`LIKE 'a/%'` would also find a root asset whose slug is `a/b`. For
`images [1] / 2026 [2] / logo.png [3]` the rows are `(1,1,0) (1,2,1) (1,3,2)
(2,2,0) (2,3,1) (3,3,0)` as `(ancestor, descendant, depth)`.
- Subtree: `WHERE ancestor_id = :id AND depth > 0` (PK).
- Breadcrumbs: `WHERE descendant_id = :id ORDER BY depth DESC` (descendant
  index). Direct children: `parent_id`.
- Insert under parent P: copy P's ancestor rows with `depth + 1`, plus the
  self row at depth 0.
- Move a subtree: delete links from its old ancestors to its nodes (keep the
  links inside it), then link every new ancestor to every node with depths
  added. Same transaction as the `parent_id` and `full_slug` updates. A
  new `full_slug` can clash with an unrelated asset's (see
  `assets_full_slug_unique`); report it as "name taken" and roll back.
- Delete: the FK cascades remove the rows.
- Cost: about n × depth rows and heavier moves; worth it since folder trees
  are shallow and read far more often than moved.

### Example rows

|  id | parent_id | kind      | slug        | full_slug     | filename    | storage | storage_key | url                           | visibility |
| --: | --------: | --------- | ----------- | ------------- | ----------- | ------- | ----------- | ----------------------------- | ---------- |
| 100 |           | directory | images      | images        | Images      |         |             |                               | public     |
| 101 |       100 | file      | logo        | images/logo   | Logo.png    | local   | a8f31c….png |                               | public     |
| 102 |           | file      | invoice-123 | invoice-123   | Invoice.pdf | local   | 9b2e47….pdf |                               | private    |
| 103 |       100 | link      | banner      | images/banner | Banner.jpg  |         |             | https://cdn.example.com/b.jpg | public     |
| 104 |           | file      | secret      | secret        | Secret.pdf  | local   | c0d91a….pdf |                               | private    |

`storage_key` is `{uuid}.{ext}` (not `{id}/...`: bytes are stored before
the row exists, and deleted again if the insert fails), files only, and
unique per backend only. No folder prefix for now; add one if the bucket
ever holds other kinds of objects. `key` is the asset's public name, on
every kind and unique across backends: a new file's starts equal to its
storage key and stays when the file moves to another backend. Rich
text references any asset as `serve/{key}` (relative to the
site's base URL, which forwards `/serve/*` to the api's `/serve/*`); the
api replaces it with the backend's URL (the local backend's is the same
`/serve/{storage_key}`; a link's own URL) in public responses.
Renaming or moving an asset only changes `slug`/`parent_id`/`full_slug`,
never the stored object; the random UUID stops keys from being guessed.

## Asset usages

Assets live in one central table. Other contexts never hold asset ids in
their own tables: every use is an `asset_usages` row with a `slot`. The
table only records where an asset is used; per-use data (a caption, alt
text) belongs in a typed table of the owning context, such as shop's
`ProductGalleryItem`.
1. **Single slot** (one asset per owner): `user.avatar`, `post.cover`. Enforced
   in the domain only (no index): attaching replaces the previous row and
   asset, which the caller deletes if nothing else uses it.
2. **Lists** (galleries, downloads, inline images): `post.gallery`,
   `post.download`, ordered by `position`.

3. **The owner's own folder**: slot `folder` (a single slot), pointing at a
   directory named `<label> #<id>` (e.g. `Hello world #42`, slug
   `hello-world-42`). Created on first use by `EnsureEntityFolderCommand`
   under one public top-level folder per type (`posts` -> `Posts`,
   `products`), with no creator. Concurrent calls end with one folder linked. Linked by id, so renaming or moving it in the
   library keeps the link, and it can't be deleted while linked. The
   editor's file picker is scoped to it and uploads go into it (convenience,
   not access control: the library still shows everything).

   A new model with files adds its slots (including `folder`) to
   `ASSET_SLOTS`, and exposes
   `POST /<models>/:id/folder`, which checks its own permissions and runs
   the command (built: `POST /posts/:id/folder`, `POST /products/:id/folder`).
   The web side is `useMediaPicker({ resolveScope })`.

Slots per owner type (`ASSET_SLOTS`, `domain/asset-slots.ts`):

| owner_type             | single slots      | lists                                           |
| ---------------------- | ----------------- | ----------------------------------------------- |
| `user`                 | `avatar`          |                                                 |
| `post`                 | `folder`, `cover` | `gallery`, `download`, `inline`                 |
| `product`              | `folder`, `cover` | `inline` (gallery: shop's `ProductGalleryItem`) |
| `product_variant`      | `image`           |                                                 |
| `product_option_value` | `image`           |                                                 |
| `page`                 |                   | `inline`                                        |
| `page_layout`          |                   | `inline`                                        |

Other slots fail with `invalid_asset_slot`.

Why one table for both: one place answers "where is this asset used" and
blocks deleting it (`RESTRICT`), and owners need no column per slot. The
cost: no FK on the owner side, so the owning context removes its rows when
the owner is deleted (e.g. `DeleteUserCommand` detaches the avatar).

|  id | asset_id | owner_type | owner_id | slot     | position |
| --: | -------: | ---------- | -------: | -------- | -------: |
|   1 |      101 | post       |        5 | gallery  |        0 |
|   2 |      103 | post       |        5 | gallery  |        1 |
|   3 |      101 | post       |        9 | gallery  |        0 |
|   4 |      102 | post       |        5 | download |        0 |
|   5 |      105 | user       |      123 | avatar   |        0 |

Asset 101 is in two galleries; post 5 has a two-image gallery and a download;
user 123's avatar is asset 105.

```sql
SELECT a.*
FROM asset_usages t
JOIN assets a ON a.id = t.asset_id
WHERE t.owner_type = 'post' AND t.owner_id = 5 AND t.slot = 'gallery'
ORDER BY t.position;
```

Notes:
- Other contexts go through storage's commands and queries, never by
  importing storage entities: `AttachAssetCommand` (`asset_already_used` if
  in the list), `SetAssetUsagesCommand` (a list holds exactly these ids, in
  order; returns the removed ones), `DetachAssetsCommand`,
  `EnsureFolderCommand` (a root system folder, e.g. `avatars`),
  `EnsureEntityFolderCommand`, `GetAssetUsagesQuery` (many owners at once,
  with URLs), `GetAssetUrlQuery`, `HasPrivateAssetUsagesQuery` (a public
  page can't show a private file), `FindPublicFilesByKeysQuery` (`serve/<key>`
  keys in content back to asset ids).
- `slot` is free text in the database; the domain's `ASSET_SLOTS` lists
  the slots per `owner_type` and which are single slots.
- Reordering rewrites `position` for the affected rows; fine for list sizes in
  the tens.
- An asset is unused when no `asset_usages` row references it.

## Serving files

- **Public** (local backend): `GET /serve/<storage_key>` (`ServeController`,
  public route), cached for a year (`immutable`): keys never change content.
  S3 would hand out its own URLs (`Storage.url`).
- **Private**: `AssetView.url` is a signed link for the viewer, through the
  api (forwarded by the web app):

```
/assets/104/content?user=123&expires=1760000000&kid=...&signature=...
```

```
signature = base64url(HMAC-SHA256(
    key,
    "GET\n/assets/104/content\nuser=123\nexpires=1760000000\nkid=..."
))
```

Serving (`GetSignedFileQuery`, `HmacUrlSigner`):
1. Reject if a field is missing or `expires` is in the past.
2. Find the key by `kid`, rebuild the string and compare with
   `crypto.timingSafeEqual`, never `===`.
3. Re-check the user: the signature only proves the link was issued, not
   that access hasn't been revoked. Today this only checks the user is
   active; it does not check per-asset permission.

Any refusal is `404 asset_not_found`; the response is `private, no-store`.
- Links live 10 minutes. Keys are derived with HKDF from `JWT_SECRET` /
  `JWT_SECRET_PREVIOUS` (labels `asset-url`, `asset-url-kid`), so they
  rotate with tokens yet can't sign them.
- The canonical string has field names and the path, so parameters can't be
  reordered or moved to another asset.
- These per-asset links stay the way the app shows private files, whatever
  the backend, because serving re-checks access. `Storage.signedUrl` (S3
  presigned, or the local `/storage` route) is for one-off handouts where
  the link itself is the permission.

## Api

`AssetsController`, `/assets`, any signed-in user (bearer token):

| Route                         | Does                                                           |
| ----------------------------- | -------------------------------------------------------------- |
| `GET /assets?folderId&q&...`  | List a folder (root without `folderId`); `q` searches below it |
| `GET /assets/folders`         | All folders, for move pickers                                  |
| `GET /assets/by-path?path`    | Find an item by `full_slug`                                    |
| `GET /assets/:id`             | One item (`AssetView`)                                         |
| `POST /assets`                | Upload (multipart `file`, `parentId`, `visibility`)            |
| `POST /assets/folders`        | Create a folder                                                |
| `POST /assets/links`          | Add a link to an external URL                                  |
| `PATCH /assets/:id`           | Rename, change visibility and/or a link's URL                  |
| `POST /assets/:id/move`       | Move (`parentId: null` is the root)                            |
| `DELETE /assets/:id`          | Delete, with everything inside for a folder (`204`)            |
| `GET /assets/:id/content?...` | Private file by signed link (public route)                     |

Plus `GET /serve/:key` (public files of the local backend, link redirects) and `GET` / `PUT
/storage/*` (signed storage links). The web panel `/panel/media` uses these.
- Who may change items: everyone may browse and add; renaming, visibility,
  link URLs, moving and deleting need admin/editor, or an author who created the item
  (`checkCanManage`, `asset_forbidden`).
- Errors: `asset_not_found` (404), `name_taken` / `asset_in_use` /
  `asset_already_used` (409), `asset_forbidden` (403), `invalid_name`,
  `invalid_link_url`, `not_a_link`, `not_a_folder`, `move_into_itself`,
  `unsupported_file_type`, `file_too_large`, `empty_file`,
  `invalid_asset_slot` (400).
- No domain events; other contexts call the commands and queries above.

## Implementation notes

- Uploads go through the api (20 MB), which sniffs the bytes (png, jpeg,
  webp, gif, pdf); a clashing upload name gets `-2`, `-3` before the
  extension, while a clashing folder name is `name_taken`.
- Links: absolute http(s) URLs only.
- Visibility is per asset, not inherited from folders.
- Deleting: rows first (subtree via cascade), then the bytes after commit; a
  leftover object is harmless, a dangling row is not. A used asset
  (`RESTRICT`, SQLSTATE 23001 or 23503) blocks the delete with
  `asset_in_use`.
- No deduplication by `checksum`: shared objects would make deletes unsafe.

## Not built yet

- `S3Storage` backend (would wrap `S3Disk`).
- A "where used" view in the media panel (the `asset_id` index is ready).
- Private reads checking per-asset permission, not just "active user".

## Open questions

- Direct uploads with `signedUpload` (no api bandwidth): needs a "confirm
  upload" step that `stat`s the key, sniffs the first bytes and only then
  inserts the asset row. The local backend supports the links already.
