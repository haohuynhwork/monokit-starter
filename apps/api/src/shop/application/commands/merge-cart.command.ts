import { Command } from "@nestjs/cqrs";
import type { CartLine } from "../../domain/cart.js";

// A guest's cart (kept by the browser) joining the user's at login
export class MergeCartCommand extends Command<void> {
  constructor(
    readonly userId: bigint,
    readonly lines: CartLine[],
  ) {
    super();
  }
}
