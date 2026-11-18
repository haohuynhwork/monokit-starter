import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  WISHLIST_REPOSITORY,
  type WishlistRepository,
} from "../../domain/shop.repository.js";
import { wishableIds } from "../../domain/wishlist.js";
import { MergeWishlistCommand } from "./merge-wishlist.command.js";

@CommandHandler(MergeWishlistCommand)
export class MergeWishlistHandler
  implements ICommandHandler<MergeWishlistCommand>
{
  constructor(
    @Inject(WISHLIST_REPOSITORY) private readonly wishlist: WishlistRepository,
  ) {}

  async execute({ userId, productIds }: MergeWishlistCommand): Promise<void> {
    const statuses = await this.wishlist.productStatuses(productIds);
    for (const id of wishableIds(statuses, productIds)) {
      await this.wishlist.add(userId, id);
    }
  }
}
