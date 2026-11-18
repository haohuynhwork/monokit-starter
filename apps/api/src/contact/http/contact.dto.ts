import { z } from "zod";
import { CONTACT_MESSAGE_STATUSES } from "../domain/contact-message.js";

const status = z.enum(CONTACT_MESSAGE_STATUSES);

export const listContactMessagesSchema = z.object({
  status: status.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListContactMessagesDto = z.infer<typeof listContactMessagesSchema>;

export const contactMessageStatusSchema = z.object({
  status,
});
export type ContactMessageStatusDto = z.infer<
  typeof contactMessageStatusSchema
>;

// --- Responses (docs only; match ContactMessageView / Detail) ---

export const contactMessageViewSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  subject: z.string().nullable(),
  message: z.string().nullable(),
  messageFormat: z.enum([
    "text",
    "html",
  ]),
  status,
  mailedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const contactMessageDetailSchema = contactMessageViewSchema.extend({
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
});

export const contactMessageCountsSchema = z.record(status, z.number().int());

// A message staff add by hand; `message` is HTML from the editor
export const createContactMessageSchema = z.object({
  name: z.string().max(255).optional(),
  email: z.string().max(320).optional(),
  phone: z.string().max(50).optional(),
  subject: z.string().max(255).optional(),
  message: z.string().max(100_000).optional(),
  status: status.default("read"),
});
export type CreateContactMessageDto = z.infer<
  typeof createContactMessageSchema
>;
