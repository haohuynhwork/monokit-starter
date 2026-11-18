import { z } from "zod";

export const previewContentSchema = z.object({
  // Same limit as post and product bodies
  html: z.string().max(1_000_000),
});
export type PreviewContentDto = z.infer<typeof previewContentSchema>;

export const previewedContentSchema = z.object({
  // As stored: images keep their relative 'serve/<key>' src
  html: z.string(),
});
