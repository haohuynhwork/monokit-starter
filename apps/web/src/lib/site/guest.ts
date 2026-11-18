import { api } from "@/lib/api";
import { storageKey } from "@/lib/app-prefix";

// A signed-out visitor's cart and saved products, kept in localStorage and
// merged into the account after sign-in (ideas/orders/cart.md).

// Cart: variant ids and quantities only; prices come from the api. Merged
// with mergeGuestCart().
export type GuestLine = {
  variantId: string;
  quantity: number;
};

const CART_KEY = storageKey("cart");
const MAX_LINES = 50;
export const MAX_QUANTITY = 99;

// Fired on window whenever the cart (guest or account) changes
export const CART_CHANGED = "monokit:cart-changed";
export const notifyCartChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_CHANGED));
  }
};

export function readGuestCart(): GuestLine[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    // [[variantId, quantity], ...]; anything malformed is dropped
    return parsed
      .filter(
        (
          l,
        ): l is [
          string,
          number,
        ] =>
          Array.isArray(l) &&
          typeof l[0] === "string" &&
          /^[1-9]\d{0,18}$/.test(l[0]) &&
          Number.isInteger(l[1]) &&
          l[1] >= 1 &&
          l[1] <= MAX_QUANTITY,
      )
      .slice(0, MAX_LINES)
      .map(([variantId, quantity]) => ({
        variantId,
        quantity,
      }));
  } catch {
    return [];
  }
}

export function writeGuestCart(lines: GuestLine[]): void {
  try {
    if (lines.length === 0) {
      localStorage.removeItem(CART_KEY);
    } else {
      localStorage.setItem(
        CART_KEY,
        JSON.stringify(
          lines.slice(-MAX_LINES).map((l) => [
            l.variantId,
            l.quantity,
          ]),
        ),
      );
    }
  } catch {
    // storage blocked: the cart just doesn't persist
  }
  notifyCartChanged();
}

// Units in the guest cart
export const guestCartCount = () =>
  readGuestCart().reduce((n, l) => n + l.quantity, 0);

// After signing in (login, register): the guest cart joins the account's and
// is cleared. A failure keeps it for the next sign-in.
export async function mergeGuestCart(): Promise<void> {
  const lines = readGuestCart();
  if (lines.length === 0) {
    return;
  }
  const res = await api("/me/cart/merge", {
    method: "POST",
    body: {
      items: lines,
    },
    silent: true,
  });
  if (res.status === "success") {
    writeGuestCart([]);
  }
}

// Wishlist: product ids, newest first. Merged with mergeGuestWishlist().
const WISHLIST_KEY = storageKey("wishlist");
const MAX_IDS = 100;

export function readGuestWishlist(): string[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(WISHLIST_KEY) ?? "[]",
    );
    return Array.isArray(parsed)
      ? parsed
          .filter(
            (id): id is string =>
              typeof id === "string" && /^[1-9]\d{0,18}$/.test(id),
          )
          .slice(0, MAX_IDS)
      : [];
  } catch {
    return [];
  }
}

export function writeGuestWishlist(ids: string[]): void {
  try {
    if (ids.length === 0) {
      localStorage.removeItem(WISHLIST_KEY);
    } else {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids.slice(0, MAX_IDS)));
    }
  } catch {
    // storage blocked: the list just doesn't persist
  }
}

// After signing in: the guest's products join the account's and the local
// list is cleared. A failure keeps it for the next sign-in.
export async function mergeGuestWishlist(): Promise<void> {
  const ids = readGuestWishlist();
  if (ids.length === 0) {
    return;
  }
  const res = await api("/me/wishlist/merge", {
    method: "POST",
    body: {
      productIds: ids,
    },
    silent: true,
  });
  if (res.status === "success") {
    writeGuestWishlist([]);
  }
}
