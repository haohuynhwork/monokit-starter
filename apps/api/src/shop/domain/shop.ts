import { InvalidShopInputError, ShopForbiddenError } from "./shop.errors.js";

// Shared rules of the shop context (ideas/orders)

export type Actor = {
  id: bigint;
  permissions: ReadonlySet<string>;
};

// Whoever may manage products, categories and orders
export function checkStaff(actor: Actor): void {
  if (!actor.permissions.has("shop:manage")) {
    throw new ShopForbiddenError();
  }
}

// Products (and their files in the media library) belong to whoever created
// them: shop staff edit their own, product:edit:any covers every product
// (seeded ones have no creator)
export function checkCanEditProduct(
  actor: Actor,
  product: {
    createdById: bigint | null;
  },
): void {
  if (actor.permissions.has("product:edit:any")) {
    return;
  }
  checkStaff(actor);
  if (product.createdById !== actor.id) {
    throw new ShopForbiddenError();
  }
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Lowercase letters, digits and single dashes: 'blue-shirts'
export function checkSlug(slug: string): string {
  const s = slug.trim().toLowerCase();
  if (!SLUG.test(s) || s.length > 255) {
    throw new InvalidShopInputError(
      "Slugs use lowercase letters, digits and dashes",
    );
  }
  return s;
}

export function checkName(name: string, what = "Name"): string {
  const s = name.trim();
  if (!s || s.length > 255) {
    throw new InvalidShopInputError(`${what} is required (max 255 characters)`);
  }
  return s;
}

// Money is integer minor units (cents)
export function checkMoney(value: bigint, what: string): bigint {
  if (value < 0n) {
    throw new InvalidShopInputError(`${what} cannot be negative`);
  }
  return value;
}
