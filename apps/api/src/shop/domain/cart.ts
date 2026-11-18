import {
  InvalidShopInputError,
  OutOfStockError,
  ProductUnavailableError,
} from "./shop.errors.js";

// Rules from ideas/orders/cart.md

export const MAX_CART_LINES = 50;
export const MAX_LINE_QUANTITY = 99;

// What the cart needs to know about a variant to accept it
export interface Sellable {
  variantId: bigint;
  // "Hoodie (M / Red)", for messages
  label: string;
  status: "draft" | "active" | "archived";
  trackStock: boolean;
  stock: number;
}

export interface CartLine {
  variantId: bigint;
  quantity: number;
}

function checkQuantity(quantity: number): void {
  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_LINE_QUANTITY
  ) {
    throw new InvalidShopInputError(`Quantity is 1 to ${MAX_LINE_QUANTITY}`);
  }
}

// Only active products, and no more than tracked stock. Prices are not
// kept: the cart always shows what things cost now.
function checkSellable(item: Sellable | undefined, quantity: number): void {
  if (!item || item.status !== "active") {
    throw new ProductUnavailableError(
      `${item?.label ?? "This product"} is not for sale`,
    );
  }
  if (item.trackStock && item.stock < quantity) {
    throw new OutOfStockError(
      item.stock > 0
        ? `Only ${item.stock} of ${item.label} left in stock`
        : `${item.label} is out of stock`,
    );
  }
}

// A customer's cart: one line per variant, saved whole
export class Cart {
  private readonly lines: Map<bigint, number>;

  private constructor(
    readonly userId: bigint,
    lines: CartLine[],
  ) {
    this.lines = new Map(
      lines.map((l) => [
        l.variantId,
        l.quantity,
      ]),
    );
  }

  static restore(userId: bigint, lines: CartLine[]): Cart {
    return new Cart(userId, lines);
  }

  // Adds to the line's quantity (or starts one)
  add(variantId: bigint, quantity: number, item: Sellable | undefined): void {
    checkQuantity(quantity);
    const current = this.lines.get(variantId) ?? 0;
    if (current === 0 && this.lines.size >= MAX_CART_LINES) {
      throw new InvalidShopInputError(
        `A cart holds at most ${MAX_CART_LINES} products`,
      );
    }
    const next = current + quantity;
    checkQuantity(next);
    checkSellable(item, next);
    this.lines.set(variantId, next);
  }

  // Sets the line's quantity; the line must exist
  setQuantity(
    variantId: bigint,
    quantity: number,
    item: Sellable | undefined,
  ): void {
    if (!this.lines.has(variantId)) {
      throw new InvalidShopInputError("That product is not in the cart");
    }
    checkQuantity(quantity);
    checkSellable(item, quantity);
    this.lines.set(variantId, quantity);
  }

  // A guest's cart joining this one at login. Never fails: lines that
  // can't be ordered are skipped, quantities are capped (99, tracked stock)
  // and lines past the limit are left out.
  merge(lines: CartLine[], items: Sellable[]): void {
    const byId = new Map(
      items.map((i) => [
        i.variantId,
        i,
      ]),
    );
    for (const { variantId, quantity } of lines) {
      const item = byId.get(variantId);
      const current = this.lines.get(variantId) ?? 0;
      if (
        !item ||
        item.status !== "active" ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        (current === 0 && this.lines.size >= MAX_CART_LINES)
      ) {
        continue;
      }
      const cap = item.trackStock
        ? Math.min(MAX_LINE_QUANTITY, item.stock)
        : MAX_LINE_QUANTITY;
      const next = Math.min(cap, current + quantity);
      if (next > current) {
        this.lines.set(variantId, next);
      }
    }
  }

  // Removing what isn't there is fine
  remove(variantIds: bigint[]): void {
    for (const id of variantIds) {
      this.lines.delete(id);
    }
  }

  clear(): void {
    this.lines.clear();
  }

  snapshot(): CartLine[] {
    return [
      ...this.lines,
    ].map(([variantId, quantity]) => ({
      variantId,
      quantity,
    }));
  }
}
