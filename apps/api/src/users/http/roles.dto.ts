import { z } from "zod";

const permissions = z.array(z.string().max(100)).max(100);

export const createRoleSchema = z.object({
  key: z.string().trim().min(2).max(50).meta({
    example: "moderator",
  }),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).nullable().default(null),
  permissions: permissions.default([]),
});
export type CreateRoleDto = z.infer<typeof createRoleSchema>;

// The key is fixed once created
export const updateRoleSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(1000).nullable(),
    permissions,
  })
  .partial();
export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;

// Response, docs only (matches RoleView)
export const roleViewSchema = z.object({
  id: z.string().meta({
    example: "1",
  }),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  system: z.boolean(),
  permissions: z.array(z.string()),
  users: z.number().int(),
});
