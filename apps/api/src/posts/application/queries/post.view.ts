import type { Db } from "@packages/nest";
import type { PostStatus } from "../../domain/post.js";

// A tag as shown on a post; its page is /tags/<slug>
export interface TagRef {
  name: string;
  slug: string;
}

export interface Cover {
  assetId: string;
  url: string | null;
}

// The panel's full view of one post
export interface PostView {
  id: string;
  parentId: string | null;
  authorId: string | null;
  title: string;
  slug: string | null;
  // null: not reachable yet (no slug here or above)
  path: string | null;
  content: string;
  description: string | null;
  tags: TagRef[];
  status: PostStatus;
  publishedAt: string | null;
  // Visible on the site now (published, or scheduled and due)
  live: boolean;
  cover: Cover | null;
  // Text in the non-default locales (ideas/i18n)
  translations: PostTranslationView[];
  createdAt: string;
  updatedAt: string;
}

export interface PostTranslationView {
  // Locale code, e.g. 'vi-VN'
  locale: string;
  title: string;
  // null: the post's own slug
  slug: string | null;
  // The path in this locale; null when not reachable
  path: string | null;
  content: string;
  description: string | null;
  updatedAt: string;
}

export type PostSummary = Omit<PostView, "content" | "cover" | "translations">;

// Another language version of a public item, for hreflang and switchers
export interface Alternate {
  locale: string;
  path: string;
}

// What the public site gets: no drafts, no internal ids
export interface PublicPostView {
  title: string;
  path: string;
  content: string;
  description: string | null;
  tags: TagRef[];
  publishedAt: string;
  coverUrl: string | null;
  // The locale this text is in: the requested one, or the default when the
  // post has no translation in it
  locale: string;
  // Every locale's path, the default first (single-post reads only)
  alternates?: Alternate[];
}

export const SUMMARY_FIELDS = [
  "id",
  "parentId",
  "authorId",
  "title",
  "slug",
  "fullSlug",
  "description",
  "status",
  "publishedAt",
  "createdAt",
  "updatedAt",
] as const;

export interface SummaryRow {
  id: bigint;
  parentId: bigint | null;
  authorId: bigint | null;
  title: string;
  slug: string | null;
  fullSlug: string | null;
  description: string | null;
  status: PostStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function isLive(
  row: {
    status: PostStatus;
    publishedAt: string | null;
  },
  now = Date.now(),
): boolean {
  return (
    row.status !== "draft" &&
    row.publishedAt !== null &&
    Date.parse(row.publishedAt) <= now
  );
}

export function toSummary(row: SummaryRow, tags: TagRef[]): PostSummary {
  return {
    id: String(row.id),
    parentId: row.parentId === null ? null : String(row.parentId),
    authorId: row.authorId === null ? null : String(row.authorId),
    title: row.title,
    slug: row.slug,
    path: row.fullSlug,
    description: row.description,
    tags,
    status: row.status,
    publishedAt: row.publishedAt,
    live: isLive(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Each post's tags in its order, for a whole page of posts in two queries
export async function loadTags(
  db: Db,
  postIds: bigint[],
): Promise<Map<bigint, TagRef[]>> {
  const byPost = new Map<bigint, TagRef[]>(
    postIds.map((id) => [
      id,
      [],
    ]),
  );
  if (!postIds.length) {
    return byPost;
  }
  const taggings = await db.orm.public.PostTagging.select("postId", "tagId")
    .where((t) => t.postId.in(postIds))
    .orderBy([
      (t) => t.position.asc(),
      (t) => t.tagId.asc(),
    ])
    .all();
  if (!taggings.length) {
    return byPost;
  }
  const tags = await db.orm.public.PostTag.select("id", "name", "slug")
    .where((t) =>
      t.id.in([
        ...new Set(taggings.map((g) => g.tagId)),
      ]),
    )
    .all();
  const byId = new Map(
    tags.map((t) => [
      t.id,
      {
        name: t.name,
        slug: t.slug,
      },
    ]),
  );
  for (const { postId, tagId } of taggings) {
    const tag = byId.get(tagId);
    if (tag) {
      byPost.get(postId)?.push(tag);
    }
  }
  return byPost;
}

// Ids of the posts with a tag; null when no such tag
export async function postIdsWithTag(
  db: Db,
  slug: string,
): Promise<bigint[] | null> {
  const tag = await db.orm.public.PostTag.select("id")
    .where({
      slug: slug.trim().toLowerCase(),
    })
    .first();
  if (!tag) {
    return null;
  }
  const rows = await db.orm.public.PostTagging.select("postId")
    .where({
      tagId: tag.id,
    })
    .all();
  return rows.map((r) => r.postId);
}
