import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  WISHLIST_REPOSITORY,
  type WishlistRepository,
} from "../../domain/shop.repository.js";
import { checkWishable } from "../../domain/wishlist.js";
import { AddToWishlistCommand } from "./add-to-wishlist.command.js";

@CommandHandler(AddToWishlistCommand)
export class AddToWishlistHandler
  implements ICommandHandler<AddToWishlistCommand>
{
  constructor(
    @Inject(WISHLIST_REPOSITORY) private readonly wishlist: WishlistRepository,
  ) {}

  async execute({ userId, productId }: AddToWishlistCommand): Promise<void> {
    const status = await this.wishlist.productStatus(productId);
    checkWishable(
      status
        ? {
            status,
          }
        : null,
    );
    await this.wishlist.add(userId, productId);
  }
}
