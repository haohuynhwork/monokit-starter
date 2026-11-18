import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { checkRating } from "../../domain/rating.js";
import {
  ProductNotFoundError,
  RatingNotAllowedError,
} from "../../domain/shop.errors.js";
import {
  ORDER_REPOSITORY,
  type OrderRepository,
  PRODUCT_REPOSITORY,
  type ProductRepository,
  RATING_REPOSITORY,
  type RatingRepository,
} from "../../domain/shop.repository.js";
import { RateProductCommand } from "./rate-product.command.js";

@CommandHandler(RateProductCommand)
export class RateProductHandler implements ICommandHandler<RateProductCommand> {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(RATING_REPOSITORY) private readonly ratings: RatingRepository,
  ) {}

  async execute({
    userId,
    productId,
    stars,
    body,
  }: RateProductCommand): Promise<void> {
    const rating = checkRating(stars, body);
    if (!(await this.products.findById(productId))) {
      throw new ProductNotFoundError();
    }
    if (!(await this.orders.hasDelivered(userId, productId))) {
      throw new RatingNotAllowedError();
    }
    await this.ratings.upsert(productId, userId, rating);
  }
}
