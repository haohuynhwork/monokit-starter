import { useEffect, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { fetchMe } from "@/lib/auth";
import type { Cart, Product, User } from "@/lib/types";
import {
  CART_CHANGED,
  type GuestLine,
  guestCartCount,
  MAX_QUANTITY,
  mergeGuestCart,
  mergeGuestWishlist,
  notifyCartChanged,
  readGuestCart,
  readGuestWishlist,
  writeGuestCart,
  writeGuestWishlist,
} from "./guest";
import { listGuestWishlist, priceGuestCart } from "./public-shop";

// The shop from the browser: signed in (the admin session cookie), the
// account's cart and wishlist through the api; signed out, the local guest
// ones (guest-cart.ts, guest-wishlist.ts).

export type ShopResult = {
  ok?: boolean;
  message?: string;
};

export const ORDER_ERRORS: Record<string, string> = {
  out_of_stock: "Not enough in stock for that quantity.",
  product_unavailable: "That product can't be ordered right now.",
  country_not_shipped: "We don't ship to that address's country.",
};

// The signed-in user or null; fetched once and shared until forgetSession()
let session: Promise<User | null> | null = null;
export function currentUser(): Promise<User | null> {
  session ??= fetchMe();
  return session;
}

// Call after signing in or out
export const forgetSession = () => {
  session = null;
};

function failMessage(res: {
  code?: string | null;
  message?: string | null;
  data?: unknown;
}): string {
  const issues = (
    res.data as
      | {
          issues?: {
            message: string;
          }[];
        }
      | undefined
  )?.issues;
  return (
    (res.code && ORDER_ERRORS[res.code]) ||
    issues?.[0]?.message ||
    res.message ||
    "Something went wrong."
  );
}

// A write for the signed-in customer
async function meCall(
  path: string,
  init: {
    method: string;
    body?: unknown;
  },
): Promise<ShopResult> {
  const res = await api(path, {
    ...init,
    silent: true,
  });
  if (res.status !== "success") {
    return {
      message: failMessage(res),
    };
  }
  return {
    ok: true,
  };
}

const emptyCart = (): Cart => ({
  items: [],
  count: 0,
  subtotal: "0",
});

// The cart as the customer sees it now: the account's, or the guest cart
// priced by the api. Lines saved as a guest join the account first.
export async function loadCart(): Promise<{
  cart: Cart | null;
  guest: boolean;
  message?: string;
}> {
  const user = await currentUser();
  if (user) {
    await mergeGuestCart();
    const res = await api<Cart>("/me/cart", {
      silent: true,
    });
    return res.status === "success" && res.data
      ? {
          cart: res.data,
          guest: false,
        }
      : {
          cart: null,
          guest: false,
          message: res.message ?? "Couldn't load your cart.",
        };
  }
  try {
    const cart = await priceGuestCart({
      data: {
        items: readGuestCart(),
      },
    });
    return cart
      ? {
          cart,
          guest: true,
        }
      : {
          cart: null,
          guest: true,
          message: "Couldn't load your cart.",
        };
  } catch {
    return {
      cart: emptyCart(),
      guest: true,
      message: "Couldn't load your cart.",
    };
  }
}

// Signed out: the change is checked by pricing the new cart, and kept only
// if that line can be ordered
async function changeGuestCart(
  change: (lines: GuestLine[]) => GuestLine[],
  variantId: string,
): Promise<ShopResult> {
  const lines = change(readGuestCart());
  if (lines.some((l) => l.variantId === variantId)) {
    try {
      const priced = await priceGuestCart({
        data: {
          items: lines,
        },
      });
      const problem = priced
        ? (priced.items.find((i) => i.variantId === variantId)?.problem ?? null)
        : "Couldn't check the cart.";
      if (problem) {
        return {
          message: problem,
        };
      }
    } catch {
      return {
        message: "Couldn't check the cart.",
      };
    }
  }
  writeGuestCart(lines);
  return {
    ok: true,
  };
}

async function signedInCall(
  path: string,
  init: {
    method: string;
    body?: unknown;
  },
): Promise<ShopResult> {
  const res = await meCall(path, init);
  if (res.ok) {
    notifyCartChanged();
  }
  return res;
}

export async function addToCart(
  variantId: string,
  quantity: number,
): Promise<ShopResult> {
  if (!(await currentUser())) {
    return changeGuestCart((lines) => {
      const found = lines.find((l) => l.variantId === variantId);
      return found
        ? lines.map((l) =>
            l === found
              ? {
                  variantId,
                  quantity: Math.min(MAX_QUANTITY, l.quantity + quantity),
                }
              : l,
          )
        : [
            ...lines,
            {
              variantId,
              quantity,
            },
          ];
    }, variantId);
  }
  return signedInCall("/me/cart/items", {
    method: "POST",
    body: {
      variantId,
      quantity,
    },
  });
}

export async function setCartQuantity(
  variantId: string,
  quantity: number,
): Promise<ShopResult> {
  if (!(await currentUser())) {
    return changeGuestCart(
      (lines) =>
        lines.map((l) =>
          l.variantId === variantId
            ? {
                variantId,
                quantity,
              }
            : l,
        ),
      variantId,
    );
  }
  return signedInCall(`/me/cart/items/${encodeURIComponent(variantId)}`, {
    method: "PATCH",
    body: {
      quantity,
    },
  });
}

export async function removeFromCart(variantId: string): Promise<ShopResult> {
  if (!(await currentUser())) {
    return changeGuestCart(
      (lines) => lines.filter((l) => l.variantId !== variantId),
      variantId,
    );
  }
  return signedInCall(`/me/cart/items/${encodeURIComponent(variantId)}`, {
    method: "DELETE",
  });
}

// Units in the cart, for the header
async function cartCount(): Promise<number> {
  if (!(await currentUser())) {
    return guestCartCount();
  }
  const res = await api<Cart>("/me/cart", {
    silent: true,
  });
  return res.status === "success" && res.data ? res.data.count : 0;
}

// The cart's unit count, kept up to date as the cart changes
export function useCartCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let live = true;
    const load = () =>
      void cartCount().then((n) => {
        if (live) {
          setCount(n);
        }
      });
    load();
    window.addEventListener(CART_CHANGED, load);
    return () => {
      live = false;
      window.removeEventListener(CART_CHANGED, load);
    };
  }, []);
  return count;
}

// ---- Wishlist ----

// The saved product ids, one shared copy for every heart on the page; null
// until loaded
let wishlistIds: ReadonlySet<string> | null = null;
let wishlistLoading = false;
const wishlistListeners = new Set<() => void>();
const setWishlistIds = (ids: ReadonlySet<string>) => {
  wishlistIds = ids;
  for (const l of wishlistListeners) {
    l();
  }
};

async function loadWishlistIds() {
  wishlistLoading = true;
  try {
    let ids: string[];
    if (await currentUser()) {
      await mergeGuestWishlist();
      const res = await api<string[]>("/me/wishlist/ids", {
        silent: true,
      });
      ids = res.status === "success" && res.data ? res.data : [];
    } else {
      ids = readGuestWishlist();
    }
    setWishlistIds(new Set(ids));
  } finally {
    wishlistLoading = false;
  }
}

function subscribeWishlist(listener: () => void) {
  wishlistListeners.add(listener);
  if (wishlistIds === null && !wishlistLoading) {
    void loadWishlistIds();
  }
  return () => {
    wishlistListeners.delete(listener);
  };
}

export function useWishlistIds(): ReadonlySet<string> | null {
  return useSyncExternalStore(
    subscribeWishlist,
    () => wishlistIds,
    () => null,
  );
}

// Saves or unsaves a product; the hearts follow right away and go back if
// the api says no
export async function setWishlisted(
  productId: string,
  saved: boolean,
): Promise<ShopResult> {
  const before = wishlistIds ?? new Set<string>();
  const next = new Set(before);
  if (saved) {
    next.add(productId);
  } else {
    next.delete(productId);
  }
  setWishlistIds(next);
  let res: ShopResult;
  if (await currentUser()) {
    res = await meCall(`/me/wishlist/${encodeURIComponent(productId)}`, {
      method: saved ? "PUT" : "DELETE",
    });
  } else {
    // Checked when it joins an account; the list shows only real products
    writeGuestWishlist(
      saved
        ? [
            productId,
            ...readGuestWishlist().filter((id) => id !== productId),
          ]
        : readGuestWishlist().filter((id) => id !== productId),
    );
    res = {
      ok: true,
    };
  }
  if (!res.ok) {
    setWishlistIds(before);
  }
  return res;
}

// The wishlist page: the saved products
export async function loadWishlist(): Promise<{
  products: Product[];
  guest: boolean;
  message?: string;
}> {
  if (await currentUser()) {
    await mergeGuestWishlist();
    const res = await api<Product[]>("/me/wishlist", {
      silent: true,
    });
    return res.status === "success"
      ? {
          products: res.data ?? [],
          guest: false,
        }
      : {
          products: [],
          guest: false,
          message: res.message ?? "Couldn't load your wishlist.",
        };
  }
  try {
    const products = await listGuestWishlist({
      data: {
        productIds: readGuestWishlist(),
      },
    });
    return {
      products: products ?? [],
      guest: true,
      ...(products
        ? {}
        : {
            message: "Couldn't load your wishlist.",
          }),
    };
  } catch {
    return {
      products: [],
      guest: true,
      message: "Couldn't load your wishlist.",
    };
  }
}
