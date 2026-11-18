import { z } from "zod";

export const sendTestEmailSchema = z.object({
  // Empty: the signed-in admin's address
  to: z.string().max(255).optional(),
  // Default true: delivered now, so a wrong setting fails here; false goes
  // through the queue like real mail
  sync: z.boolean().default(true),
});
export type SendTestEmailDto = z.infer<typeof sendTestEmailSchema>;

export const sentTestEmailSchema = z.object({
  to: z.string(),
  // It went into the queue; false when delivered already (sync, or no Valkey)
  queued: z.boolean(),
});
