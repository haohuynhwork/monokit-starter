import { InvalidShopInputError } from "./shop.errors.js";

// 1 to 5 stars and an optional review (ideas/orders/product-ratings.md)
export function checkRating(
  stars: number,
  body: string | null,
): {
  stars: number;
  body: string | null;
} {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new InvalidShopInputError("Stars are 1 to 5");
  }
  const text = body?.trim() || null;
  if (text && text.length > 2000) {
    throw new InvalidShopInputError("A review is at most 2000 characters");
  }
  return {
    stars,
    body: text,
  };
}
