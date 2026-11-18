import { z } from "zod";

// The value's shape depends on the key; the domain checks it
export const setConfigSchema = z.object({
  value: z.unknown(),
});
export type SetConfigDto = z.infer<typeof setConfigSchema>;

export const configViewSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.unknown(),
  secretsSet: z.array(z.string()),
  default: z.unknown(),
  isSet: z.boolean(),
  public: z.boolean(),
  updatedAt: z.string().nullable(),
});
export const configListSchema = z.array(configViewSchema);
export const publicConfigsSchema = z.record(z.string(), z.unknown());
