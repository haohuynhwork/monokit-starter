import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { CanAccessEntityQuery } from "../../../storage/application/queries/can-access-entity.query.js";
import { ShopForbiddenError } from "../../domain/shop.errors.js";
import { checkCanEditProduct } from "../../domain/shop.js";
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from "../../domain/shop.repository.js";

// The storage context asks this for a product's media folder: staff use the
// folders of products they may edit (their own; every one with
// product:edit:any)
@QueryHandler(CanAccessEntityQuery)
export class CanAccessProductHandler
  implements IQueryHandler<CanAccessEntityQuery>
{
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute({
    ownerType,
    ownerId,
    actor,
  }: CanAccessEntityQuery): Promise<boolean> {
    if (ownerType !== "product" || actor === null) {
      return true;
    }
    const product = await this.products.findById(ownerId);
    if (!product) {
      return true;
    }
    try {
      checkCanEditProduct(actor, product.snapshot());
      return true;
    } catch (error) {
      if (error instanceof ShopForbiddenError) {
        return false;
      }
      throw error;
    }
  }
}
