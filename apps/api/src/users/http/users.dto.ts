import { z } from "zod";

// A role key: a built-in one or a custom one (checked against the roles
// table when saved: role_not_found)
const role = z.string().trim().min(2).max(50);
const status = z.enum([
  "active",
  "disabled",
]);
const optionalName = (max: number) => z.string().trim().max(max).nullable();
// Number as typed ('0901 234 567'); the api checks it against the country's
// rules (invalid_phone). A blank number or null clears it.
const phone = z
  .object({
    country: z.string().trim().length(2).meta({
      example: "VN",
    }),
    number: z.string().max(32).meta({
      example: "0901 234 567",
    }),
  })
  .nullable();

export const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(255),
  shortName: optionalName(100).default(null),
  givenName: optionalName(255).default(null),
  familyName: optionalName(255).default(null),
  phone: phone.default(null),
});

// Email and password rules are checked again by the domain
export const createUserSchema = profileSchema.extend({
  email: z.string().max(320),
  password: z.string(),
  role: role.optional(),
});
export type CreateUserDto = z.infer<typeof createUserSchema>;

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(1).max(255),
    shortName: optionalName(100),
    givenName: optionalName(255),
    familyName: optionalName(255),
    phone,
  })
  .partial();
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string(),
  // Required: every client says whether to mail "your password was changed"
  notify: z.boolean(),
});
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const changeRoleSchema = z.object({
  role,
});
export type ChangeRoleDto = z.infer<typeof changeRoleSchema>;

export const changeStatusSchema = z.object({
  status,
});
export type ChangeStatusDto = z.infer<typeof changeStatusSchema>;

export const listUsersSchema = z.object({
  role: role.optional(),
  status: status.optional(),
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListUsersDto = z.infer<typeof listUsersSchema>;

// --- Responses (docs only; shape matches UserView) ---

export const userViewSchema = z.object({
  id: z.string().meta({
    example: "123",
  }),
  email: z.email(),
  emailVerifiedAt: z.string().nullable(),
  displayName: z.string(),
  shortName: z.string().nullable(),
  givenName: z.string().nullable(),
  familyName: z.string().nullable(),
  phone: z
    .object({
      country: z.string().meta({
        example: "VN",
      }),
      code: z.string().meta({
        example: "+84",
      }),
      number: z.string().meta({
        example: "901234567",
      }),
      e164: z.string().meta({
        example: "+84901234567",
      }),
    })
    .nullable(),
  avatarUrl: z.string().nullable(),
  status,
  role,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const permissionsViewSchema = z.object({
  roles: z.array(role),
  permissions: z.array(
    z.object({
      key: z.string(),
      group: z.string(),
      label: z.string(),
      roles: z.array(role),
    }),
  ),
});
