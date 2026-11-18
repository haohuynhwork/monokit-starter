import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  CART_REPOSITORY,
  type CartRepository,
} from "../../domain/shop.repository.js";
import { AddToCartCommand } from "./add-to-cart.command.js";

@CommandHandler(AddToCartCommand)
export class AddToCartHandler implements ICommandHandler<AddToCartCommand> {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carts: CartRepository,
  ) {}

  async execute({
    userId,
    variantId,
    quantity,
  }: AddToCartCommand): Promise<void> {
    const [cart, [item]] = await Promise.all([
      this.carts.load(userId),
      this.carts.findSellable([
        variantId,
      ]),
    ]);
    cart.add(variantId, quantity, item);
    await this.carts.save(cart);
  }
}
