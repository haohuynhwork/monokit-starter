import type { Address } from "./address.js";
import type { Cart, Sellable } from "./cart.js";
import type { Category } from "./category.js";
import type { Order, ProductForSale } from "./order.js";
import type { GalleryItem, Product } from "./product.js";

// Non-deleted only, unless noted. Slug / SKU clashes throw the matching
// *TakenError.

export interface CategoryRepository {
  findById(id: bigint): Promise<Category | null>;
  // The category and its ancestors, nearest first
  ancestorIds(id: bigint): Promise<bigint[]>;
  // Live subcategories or products
  isInUse(id: bigint): Promise<boolean>;
  save(category: Category): Promise<void>;
}
export const CATEGORY_REPOSITORY = Symbol("CATEGORY_REPOSITORY");

export interface ProductRepository {
  findById(id: bigint): Promise<Product | null>;
  save(product: Product): Promise<void>;
  // The gallery in order (ProductGalleryItem); replacing it is one
  // transaction. An unknown asset throws InvalidShopInputError.
  findGallery(productId: bigint): Promise<GalleryItem[]>;
  replaceGallery(productId: bigint, items: GalleryItem[]): Promise<void>;
}
export const PRODUCT_REPOSITORY = Symbol("PRODUCT_REPOSITORY");

export interface AddressRepository {
  findById(id: bigint): Promise<Address | null>;
  hasAny(userId: bigint): Promise<boolean>;
  // A default address clears the user's previous default (same transaction)
  save(address: Address): Promise<void>;
}
export const ADDRESS_REPOSITORY = Symbol("ADDRESS_REPOSITORY");

export interface OrderRepository {
  findById(id: bigint): Promise<Order | null>;
  // One transaction: lock the variants, build the order from them (the
  // domain checks status, stock and prices), take the stock, insert it
  place(
    variantIds: bigint[],
    build: (products: ProductForSale[]) => Order,
  ): Promise<Order>;
  // Status / payment changes, timeline rows and restock in one transaction;
  // OrderChangedError if the status changed since it was loaded
  save(order: Order): Promise<void>;
  hasDelivered(userId: bigint, productId: bigint): Promise<boolean>;
}
export const ORDER_REPOSITORY = Symbol("ORDER_REPOSITORY");

export interface RatingRepository {
  // Insert or replace; the product's cached count / sum change with it
  upsert(
    productId: bigint,
    userId: bigint,
    rating: {
      stars: number;
      body: string | null;
    },
  ): Promise<void>;
  // By id, or by (product, user); false when there was none
  delete(
    where:
      | {
          id: bigint;
        }
      | {
          productId: bigint;
          userId: bigint;
        },
  ): Promise<boolean>;
}
export const RATING_REPOSITORY = Symbol("RATING_REPOSITORY");

export interface CartRepository {
  // Empty when the user has none yet
  load(userId: bigint): Promise<Cart>;
  // Live variants among these ids, with their product's status
  findSellable(variantIds: bigint[]): Promise<Sellable[]>;
  // Replaces the user's lines with the cart's, in one transaction
  save(cart: Cart): Promise<void>;
}
export const CART_REPOSITORY = Symbol("CART_REPOSITORY");

export interface WishlistRepository {
  // Live, non-deleted product's status; null when there is none
  productStatus(
    productId: bigint,
  ): Promise<"draft" | "active" | "archived" | null>;
  // Statuses of the live products among these ids
  productStatuses(
    productIds: bigint[],
  ): Promise<Map<bigint, "draft" | "active" | "archived">>;
  // Adding twice or removing what isn't there is fine
  add(userId: bigint, productId: bigint): Promise<void>;
  remove(userId: bigint, productId: bigint): Promise<void>;
}
export const WISHLIST_REPOSITORY = Symbol("WISHLIST_REPOSITORY");
