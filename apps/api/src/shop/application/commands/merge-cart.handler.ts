import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  CART_REPOSITORY,
  type CartRepository,
} from "../../domain/shop.repository.js";
import { MergeCartCommand } from "./merge-cart.command.js";

@CommandHandler(MergeCartCommand)
export class MergeCartHandler implements ICommandHandler<MergeCartCommand> {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carts: CartRepository,
  ) {}

  async execute({ userId, lines }: MergeCartCommand): Promise<void> {
    if (!lines.length) {
      return;
    }
    const [cart, items] = await Promise.all([
      this.carts.load(userId),
      this.carts.findSellable(lines.map((l) => l.variantId)),
    ]);
    cart.merge(lines, items);
    await this.carts.save(cart);
  }
}
