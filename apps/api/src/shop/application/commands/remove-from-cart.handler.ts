import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  CART_REPOSITORY,
  type CartRepository,
} from "../../domain/shop.repository.js";
import { RemoveFromCartCommand } from "./remove-from-cart.command.js";

@CommandHandler(RemoveFromCartCommand)
export class RemoveFromCartHandler
  implements ICommandHandler<RemoveFromCartCommand>
{
  constructor(
    @Inject(CART_REPOSITORY) private readonly carts: CartRepository,
  ) {}

  async execute({ userId, variantIds }: RemoveFromCartCommand): Promise<void> {
    const cart = await this.carts.load(userId);
    if (variantIds === null) {
      cart.clear();
    } else {
      cart.remove(variantIds);
    }
    await this.carts.save(cart);
  }
}
