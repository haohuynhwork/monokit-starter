import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  CART_REPOSITORY,
  type CartRepository,
} from "../../domain/shop.repository.js";
import { SetCartQuantityCommand } from "./set-cart-quantity.command.js";

@CommandHandler(SetCartQuantityCommand)
export class SetCartQuantityHandler
  implements ICommandHandler<SetCartQuantityCommand>
{
  constructor(
    @Inject(CART_REPOSITORY) private readonly carts: CartRepository,
  ) {}

  async execute({
    userId,
    variantId,
    quantity,
  }: SetCartQuantityCommand): Promise<void> {
    const [cart, [item]] = await Promise.all([
      this.carts.load(userId),
      this.carts.findSellable([
        variantId,
      ]),
    ]);
    cart.setQuantity(variantId, quantity, item);
    await this.carts.save(cart);
  }
}
