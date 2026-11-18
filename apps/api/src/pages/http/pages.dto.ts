import { z } from "zod";

const id = z.string().regex(/^[1-9]\d{0,18}$/, "Invalid id");
const status = z.enum([
  "draft",
  "scheduled",
  "published",
]);
// Shapes inside are checked by the domain (block types, layout, options)
const json = z.record(z.string(), z.unknown());

export const createPageSchema = z.object({
  title: z.string().max(255),
  parentId: id.nullable().default(null),
  layoutId: id.nullable().default(null),
});
export type CreatePageDto = z.infer<typeof createPageSchema>;

export const updatePageSchema = z
  .object({
    title: z.string().max(255),
    description: z.string().max(500).nullable(),
    slug: z.string().max(255).nullable(),
    // { version?, layout?, <options>, blocks }
    settings: json,
    layoutId: id.nullable(),
    showInMenu: z.boolean(),
    menuOrder: z.number().int(),
  })
  .partial();
export type UpdatePageDto = z.infer<typeof updatePageSchema>;

export const movePageSchema = z.object({
  parentId: id.nullable(),
});
export type MovePageDto = z.infer<typeof movePageSchema>;

export const publishPageSchema = z.object({
  at: z.iso.datetime().optional(),
});
export type PublishPageDto = z.infer<typeof publishPageSchema>;

export const pageLayoutSchema = z.object({
  name: z.string().max(100),
  settings: json.default({}),
});
export type PageLayoutDto = z.infer<typeof pageLayoutSchema>;

export const updatePageLayoutSchema = pageLayoutSchema
  .extend({
    settings: json,
  })
  .partial();
export type UpdatePageLayoutDto = z.infer<typeof updatePageLayoutSchema>;

export const publicPageSchema = z.object({
  path: z.string().min(1).max(2048),
});
export type PublicPageDto = z.infer<typeof publicPageSchema>;

export const contactSchema = z.object({
  pageId: id,
  blockId: z.string().max(40),
  fields: z.record(z.string(), z.string().max(5000)),
  // Honeypot: hidden on the form; bots fill it
  website: z.string().max(500).optional(),
});
export type ContactDto = z.infer<typeof contactSchema>;

// --- Responses (docs only; match the views in page.view.ts) ---

const block = z.object({
  id: z.string(),
  type: z.string(),
  props: z.record(z.string(), z.unknown()),
});

export const pageSummarySchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  layoutId: z.string().nullable(),
  title: z.string(),
  slug: z.string().nullable(),
  path: z.string().nullable(),
  status,
  publishedAt: z.string().nullable(),
  live: z.boolean(),
  showInMenu: z.boolean(),
  menuOrder: z.number(),
  updatedAt: z.string(),
});

export const pageViewSchema = pageSummarySchema.extend({
  description: z.string().nullable(),
  settings: json,
  createdAt: z.string(),
});

export const publicPageViewSchema = z.object({
  id: z.string(),
  title: z.string(),
  path: z.string(),
  description: z.string().nullable(),
  publishedAt: z.string(),
  layout: json,
  options: json,
  blocks: z.array(block),
});

type Menu = {
  title: string;
  path: string;
  children: Menu[];
};
export const menuItemSchema: z.ZodType<Menu> = z.lazy(() =>
  z.object({
    title: z.string(),
    path: z.string(),
    children: z.array(menuItemSchema),
  }),
);

export const pageLayoutViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  settings: json,
  pageCount: z.number(),
  updatedAt: z.string(),
});
