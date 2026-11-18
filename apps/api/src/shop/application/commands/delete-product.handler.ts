import { Inject } from "@nestjs/common";
import { CommandBus, CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { DetachAssetsCommand } from "../../../storage/application/commands/detach-assets.command.js";
import { imageOwnerIds } from "../../domain/product.js";
import { ProductNotFoundError } from "../../domain/shop.errors.js";
import { checkCanEditProduct, checkStaff } from "../../domain/shop.js";
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from "../../domain/shop.repository.js";
import { DeleteProductCommand } from "./delete-product.command.js";

@CommandHandler(DeleteProductCommand)
export class DeleteProductHandler
  implements ICommandHandler<DeleteProductCommand>
{
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    private readonly commands: CommandBus,
  ) {}

  async execute({ productId, actor }: DeleteProductCommand): Promise<void> {
    checkStaff(actor);
    const product = await this.products.findById(productId);
    if (!product) {
      throw new ProductNotFoundError();
    }
    checkCanEditProduct(actor, product.snapshot());
    const owners = imageOwnerIds(product.snapshot());
    product.delete(new Date());
    await this.products.save(product);
    // Frees the images: an asset in a gallery can't be deleted
    await this.products.replaceGallery(productId, []);
    await this.commands.execute(new DetachAssetsCommand("product", productId));
    for (const id of owners.variants) {
      await this.commands.execute(
        new DetachAssetsCommand("product_variant", id),
      );
    }
    for (const id of owners.optionValues) {
      await this.commands.execute(
        new DetachAssetsCommand("product_option_value", id),
      );
    }
  }
}
