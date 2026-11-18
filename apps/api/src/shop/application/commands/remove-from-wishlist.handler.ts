import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  WISHLIST_REPOSITORY,
  type WishlistRepository,
} from "../../domain/shop.repository.js";
import { RemoveFromWishlistCommand } from "./remove-from-wishlist.command.js";

@CommandHandler(RemoveFromWishlistCommand)
export class RemoveFromWishlistHandler
  implements ICommandHandler<RemoveFromWishlistCommand>
{
  constructor(
    @Inject(WISHLIST_REPOSITORY) private readonly wishlist: WishlistRepository,
  ) {}

  execute({ userId, productId }: RemoveFromWishlistCommand): Promise<void> {
    return this.wishlist.remove(userId, productId);
  }
}
