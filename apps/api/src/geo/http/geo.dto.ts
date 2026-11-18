import { z } from "zod";

const id = z.string().regex(/^[1-9]\d{0,18}$/, "Invalid id");
const toId = id.transform((v) => BigInt(v));

const countryCode = z
  .string()
  .regex(/^[A-Za-z]{2}$/, "A 2-letter country code, e.g. VN")
  .transform((v) => v.toUpperCase());

export const listRegionsSchema = z.object({
  country: countryCode,
  // Omit for every level (flat); 'root' for the top level only
  parentId: z
    .union([
      z.literal("root"),
      toId,
    ])
    .optional(),
});
export type ListRegionsDto = z.infer<typeof listRegionsSchema>;

export const createRegionSchema = z.object({
  countryCode,
  code: z.string().max(20),
  name: z.string().max(255),
  parentId: toId.nullable().default(null),
  position: z.number().int().min(0).max(100000).optional(),
});
export type CreateRegionDto = z.infer<typeof createRegionSchema>;

export const updateRegionSchema = z
  .object({
    name: z.string().max(255),
    position: z.number().int().min(0).max(100000),
    active: z.boolean(),
    parentId: toId.nullable(),
  })
  .partial();
export type UpdateRegionDto = z.infer<typeof updateRegionSchema>;

// --- Responses (docs only; match region.view.ts) ---

export const regionViewSchema = z.object({
  id: z.string(),
  countryCode: z.string(),
  parentId: z.string().nullable(),
  code: z.string(),
  name: z.string(),
  position: z.number().int(),
  active: z.boolean(),
});

// --- Currencies ---

// A number or decimal text; the domain checks the range and digits
const rate = z
  .union([
    z.number().positive(),
    z.string().max(32),
  ])
  .transform((v) => String(v));

export const createCurrencySchema = z.object({
  code: z.string().max(3),
  name: z.string().max(100),
  symbol: z.string().max(10).optional(),
  decimals: z.number().int().min(0).max(4).optional(),
  rate,
  position: z.number().int().min(0).max(100000).optional(),
});
export type CreateCurrencyDto = z.infer<typeof createCurrencySchema>;

export const updateCurrencySchema = createCurrencySchema
  .omit({
    code: true,
  })
  .extend({
    active: z.boolean(),
  })
  .partial();
export type UpdateCurrencyDto = z.infer<typeof updateCurrencySchema>;

export const currencyViewSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  symbol: z.string(),
  decimals: z.number().int(),
  rate: z.string().meta({
    description: "1 base currency = rate of this one",
  }),
  rateAt: z.string(),
  active: z.boolean(),
  position: z.number().int(),
  isBase: z.boolean(),
});

export const currenciesViewSchema = z.object({
  base: z.string().meta({
    description: "config shop.currency",
  }),
  items: currencyViewSchema.array(),
});

// --- Locales ---

export const createLocaleSchema = z.object({
  code: z.string().max(16),
  name: z.string().max(100),
  nativeName: z.string().max(100).optional(),
  rtl: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  position: z.number().int().min(0).max(100000).optional(),
});
export type CreateLocaleDto = z.infer<typeof createLocaleSchema>;

export const updateLocaleSchema = createLocaleSchema
  .omit({
    code: true,
  })
  .extend({
    active: z.boolean(),
  })
  .partial();
export type UpdateLocaleDto = z.infer<typeof updateLocaleSchema>;

export const localeViewSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  nativeName: z.string(),
  rtl: z.boolean(),
  active: z.boolean(),
  isDefault: z.boolean(),
  position: z.number().int(),
});
