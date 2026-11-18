import { Inject } from "@nestjs/common";
import { CommandBus, CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { EnsureEntityFolderCommand } from "../../../storage/application/commands/ensure-entity-folder.command.js";
import { ProductNotFoundError } from "../../domain/shop.errors.js";
import { checkCanEditProduct, checkStaff } from "../../domain/shop.js";
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from "../../domain/shop.repository.js";
import { EnsureProductFolderCommand } from "./ensure-product-folder.command.js";

@CommandHandler(EnsureProductFolderCommand)
export class EnsureProductFolderHandler
  implements ICommandHandler<EnsureProductFolderCommand>
{
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    private readonly commands: CommandBus,
  ) {}

  async execute({
    productId,
    actor,
  }: EnsureProductFolderCommand): Promise<bigint> {
    checkStaff(actor);
    const product = await this.products.findById(productId);
    if (!product) {
      throw new ProductNotFoundError();
    }
    checkCanEditProduct(actor, product.snapshot());
    return this.commands.execute(
      new EnsureEntityFolderCommand("product", productId, product.name),
    );
  }
}
