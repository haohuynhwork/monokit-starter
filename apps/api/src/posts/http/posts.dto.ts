import { z } from "zod";

const id = z.string().regex(/^[1-9]\d{0,18}$/, "Invalid id");
const status = z.enum([
  "draft",
  "scheduled",
  "published",
]);

export const listPostsSchema = z.object({
  status: status.optional(),
  q: z.string().max(200).optional(),
  // Tag slug
  tag: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListPostsDto = z.infer<typeof listPostsSchema>;

export const createPostSchema = z.object({
  title: z.string().max(255),
  parentId: id.nullable().default(null),
});
export type CreatePostDto = z.infer<typeof createPostSchema>;

// Text rules are checked again by the domain; the content is sanitized there
export const updatePostSchema = z
  .object({
    title: z.string().max(255),
    content: z.string().max(1_000_000),
    description: z.string().max(500).nullable(),
    // Tag names in order; new ones are created (editors and admins)
    tags: z.array(z.string().max(100)).max(10),
    slug: z.string().max(255).nullable(),
  })
  .partial();
export type UpdatePostDto = z.infer<typeof updatePostSchema>;

// A post's text in a non-default locale; checked again by the domain
export const postTranslationSchema = z.object({
  title: z.string().max(255),
  // null or "": keep the post's own slug in this locale
  slug: z.string().max(255).nullable().default(null),
  content: z.string().max(1_000_000).default(""),
  description: z.string().max(500).nullable().default(null),
});
export type PostTranslationDto = z.infer<typeof postTranslationSchema>;

export const movePostSchema = z.object({
  parentId: id.nullable(),
});
export type MovePostDto = z.infer<typeof movePostSchema>;

// Omit `at` to publish now; a future time schedules it
export const publishPostSchema = z.object({
  at: z.iso.datetime().optional(),
});
export type PublishPostDto = z.infer<typeof publishPostSchema>;

export const setCoverSchema = z.object({
  assetId: id.nullable(),
});
export type SetCoverDto = z.infer<typeof setCoverSchema>;

// Locale code (else Accept-Language, else the default); the text falls back
// to the default locale where a post has no translation (ideas/i18n)
const locale = z.string().max(35).optional();

export const publicPostSchema = z.object({
  path: z.string().min(1).max(2048),
  locale,
});
export type PublicPostDto = z.infer<typeof publicPostSchema>;

export const publicListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  // Tag slug
  tag: z.string().max(100).optional(),
  // Tag id (postList blocks on pages)
  tagId: id.optional(),
  // Full-text search of title and content; best matches first
  q: z.string().max(200).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  locale,
});
export type PublicListDto = z.infer<typeof publicListSchema>;

export const listTagsSchema = z.object({
  q: z.string().max(100).optional(),
});
export type ListTagsDto = z.infer<typeof listTagsSchema>;

export const renameTagSchema = z.object({
  name: z.string().max(100),
});
export type RenameTagDto = z.infer<typeof renameTagSchema>;

// --- Responses (docs only; match PostView / PostSummary / PublicPostView) ---

const tagRef = z.object({
  name: z.string(),
  slug: z.string(),
});

const summaryShape = {
  id: z.string(),
  parentId: z.string().nullable(),
  authorId: z.string().nullable(),
  title: z.string(),
  slug: z.string().nullable(),
  path: z.string().nullable(),
  description: z.string().nullable(),
  tags: z.array(tagRef),
  status,
  publishedAt: z.string().nullable(),
  live: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
};

export const postViewSchema = z.object({
  ...summaryShape,
  content: z.string(),
  translations: z.array(
    z.object({
      locale: z.string(),
      title: z.string(),
      slug: z.string().nullable(),
      path: z.string().nullable(),
      content: z.string(),
      description: z.string().nullable(),
      updatedAt: z.string(),
    }),
  ),
  cover: z
    .object({
      assetId: z.string(),
      url: z.string().nullable(),
    })
    .nullable(),
});
export const postSummarySchema = z.object(summaryShape);
export const postFolderSchema = z.object({
  folderId: z.string(),
});
export const postOptionsSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    path: z.string().nullable(),
  }),
);
export const publicPostViewSchema = z.object({
  title: z.string(),
  path: z.string(),
  content: z.string(),
  description: z.string().nullable(),
  tags: z.array(tagRef),
  publishedAt: z.string(),
  coverUrl: z.string().nullable(),
  locale: z.string(),
  alternates: z
    .array(
      z.object({
        locale: z.string(),
        path: z.string(),
      }),
    )
    .optional(),
});
export const postTagViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  postCount: z.number(),
});
export const publicPostTagSchema = postTagViewSchema.omit({
  id: true,
});
