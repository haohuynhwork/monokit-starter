import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  RatingNotFoundError,
  ShopForbiddenError,
} from "../../domain/shop.errors.js";
import {
  RATING_REPOSITORY,
  type RatingRepository,
} from "../../domain/shop.repository.js";
import { DeleteRatingCommand } from "./delete-rating.command.js";

@CommandHandler(DeleteRatingCommand)
export class DeleteRatingHandler
  implements ICommandHandler<DeleteRatingCommand>
{
  constructor(
    @Inject(RATING_REPOSITORY) private readonly ratings: RatingRepository,
  ) {}

  async execute({ target, actor }: DeleteRatingCommand): Promise<void> {
    if ("ratingId" in target && !actor.permissions.has("rating:delete:any")) {
      throw new ShopForbiddenError();
    }
    const deleted = await this.ratings.delete(
      "ratingId" in target
        ? {
            id: target.ratingId,
          }
        : {
            productId: target.productId,
            userId: actor.id,
          },
    );
    if (!deleted) {
      throw new RatingNotFoundError();
    }
  }
}
