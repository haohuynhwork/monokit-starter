import { z } from "zod";

export const listNotificationsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  before: z
    .string()
    .regex(/^[1-9]\d{0,18}$/, "Invalid cursor")
    .optional(),
});
export type ListNotificationsDto = z.infer<typeof listNotificationsSchema>;

// --- Responses (docs only; match NotificationView / NotificationPage) ---

export const notificationViewSchema = z.object({
  id: z.string(),
  type: z.enum([
    "post.published",
    "order.placed",
    "test",
  ]),
  data: z.record(z.string(), z.unknown()),
  actor: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
  createdAt: z.string(),
  read: z.boolean(),
});

export const notificationPageSchema = z.object({
  items: z.array(notificationViewSchema),
  unread: z.number().int(),
  nextCursor: z.string().nullable(),
});
