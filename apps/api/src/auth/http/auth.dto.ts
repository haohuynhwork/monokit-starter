import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().max(320),
  password: z.string(),
  displayName: z.string().trim().min(1).max(255),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().max(320),
  password: z.string().max(256),
});
export type LoginDto = z.infer<typeof loginSchema>;

// Browsers send the refresh_token cookie instead
export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshDto = z.infer<typeof refreshSchema>;

// Response (docs only; matches TokenPair)
export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().meta({
    description: "Seconds",
  }),
  refreshExpiresIn: z.number().int().meta({
    description: "Seconds",
  }),
});

export const sessionListSchema = z.array(
  z.object({
    id: z.string().meta({
      example: "123",
    }),
    userAgent: z.string().nullable(),
    ip: z.string().nullable(),
    createdAt: z.string(),
    lastUsedAt: z.string(),
    current: z.boolean().meta({
      description: "The device making the request",
    }),
  }),
);

export const wsTicketSchema = z.object({
  ticket: z.string(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().max(320),
});
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

// Password rules are checked by users (weak_password)
export const resetPasswordSchema = z.object({
  token: z.string().max(2000),
  password: z.string(),
  // Required: every client says whether to mail "your password was changed"
  notify: z.boolean(),
});
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
