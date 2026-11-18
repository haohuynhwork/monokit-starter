import { Query } from "@nestjs/cqrs";
import type { CartLine } from "../../domain/cart.js";
import type { CartView } from "./shop.view.js";

// A guest's cart (kept by the browser) priced like a saved one
export class PriceCartQuery extends Query<CartView> {
  constructor(readonly lines: CartLine[]) {
    super();
  }
}
