import { z } from "zod";

const id = z.string().regex(/^[1-9]\d{0,18}$/, "Invalid id");
const visibility = z.enum([
  "public",
  "private",
]);

export const listAssetsSchema = z.object({
  folderId: id.optional(),
  q: z.string().max(200).optional(),
  type: z
    .enum([
      "all",
      "image",
    ])
    .default("all"),
  sort: z
    .enum([
      "name",
      "createdAt",
      "size",
    ])
    .default("name"),
  order: z
    .enum([
      "asc",
      "desc",
    ])
    .default("asc"),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListAssetsDto = z.infer<typeof listAssetsSchema>;

export const byPathSchema = z.object({
  path: z.string().min(1).max(2048),
});
export type ByPathDto = z.infer<typeof byPathSchema>;

// Name and URL rules are checked again by the domain
export const createFolderSchema = z.object({
  parentId: id.nullable().default(null),
  name: z.string().max(255),
  visibility: visibility.default("private"),
});
export type CreateFolderDto = z.infer<typeof createFolderSchema>;

export const createLinkSchema = z.object({
  parentId: id.nullable().default(null),
  name: z.string().max(255),
  url: z.string().max(2048),
});
export type CreateLinkDto = z.infer<typeof createLinkSchema>;

// Multipart fields next to the file
export const uploadSchema = z.object({
  parentId: id.optional(),
  visibility: visibility.default("private"),
});
export type UploadDto = z.infer<typeof uploadSchema>;

export const updateAssetSchema = z
  .object({
    name: z.string().max(255),
    visibility,
    url: z.string().max(2048),
  })
  .partial();
export type UpdateAssetDto = z.infer<typeof updateAssetSchema>;

export const moveAssetSchema = z.object({
  parentId: id.nullable(),
});
export type MoveAssetDto = z.infer<typeof moveAssetSchema>;

export const signedContentSchema = z.object({
  user: z.string().optional(),
  expires: z.string().optional(),
  kid: z.string().optional(),
  signature: z.string().optional(),
});
export type SignedContentDto = z.infer<typeof signedContentSchema>;

// --- Responses (docs only; shapes match AssetView / AssetListing) ---

export const assetViewSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  kind: z.enum([
    "file",
    "directory",
    "link",
  ]),
  visibility,
  name: z.string(),
  slug: z.string(),
  path: z.string(),
  mimeType: z.string().nullable(),
  sizeBytes: z.string().nullable(),
  url: z.string().nullable(),
  key: z.string(),
  createdById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const assetListingSchema = z.object({
  folder: assetViewSchema.nullable(),
  breadcrumbs: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    }),
  ),
  items: z.array(assetViewSchema),
  total: z.number().int(),
});

export const folderOptionsSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    path: z.string(),
  }),
);
