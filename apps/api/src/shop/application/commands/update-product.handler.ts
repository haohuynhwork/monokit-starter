import { Inject } from "@nestjs/common";
import {
  CommandBus,
  CommandHandler,
  type ICommandHandler,
  QueryBus,
} from "@nestjs/cqrs";
import {
  HTML_SANITIZER,
  type HtmlSanitizer,
} from "../../../common/domain/html.js";
import { DetachAssetsCommand } from "../../../storage/application/commands/detach-assets.command.js";
import { imageOwnerIds } from "../../domain/product.js";
import {
  CategoryNotFoundError,
  ProductNotFoundError,
} from "../../domain/shop.errors.js";
import { checkCanEditProduct, checkStaff } from "../../domain/shop.js";
import {
  CATEGORY_REPOSITORY,
  type CategoryRepository,
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from "../../domain/shop.repository.js";
import { syncInlineImages } from "../product-content.js";
import { UpdateProductCommand } from "./update-product.command.js";

@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler
  implements ICommandHandler<UpdateProductCommand>
{
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
    @Inject(HTML_SANITIZER) private readonly sanitizer: HtmlSanitizer,
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  async execute({
    productId,
    input,
    actor,
  }: UpdateProductCommand): Promise<void> {
    checkStaff(actor);
    const product = await this.products.findById(productId);
    if (!product) {
      throw new ProductNotFoundError();
    }
    checkCanEditProduct(actor, product.snapshot());
    if (
      input.categoryId &&
      !(await this.categories.findById(input.categoryId))
    ) {
      throw new CategoryNotFoundError();
    }
    const before = imageOwnerIds(product.snapshot());
    product.update({
      ...input,
      ...(input.content !== undefined && {
        content: this.sanitizer.sanitize(input.content),
      }),
    });
    await this.products.save(product);
    // Deleted variants and option values take their images with them
    const after = imageOwnerIds(product.snapshot());
    for (const id of before.variants.filter(
      (id) => !after.variants.includes(id),
    )) {
      await this.commands.execute(
        new DetachAssetsCommand("product_variant", id),
      );
    }
    for (const id of before.optionValues.filter(
      (id) => !after.optionValues.includes(id),
    )) {
      await this.commands.execute(
        new DetachAssetsCommand("product_option_value", id),
      );
    }
    if (input.content !== undefined) {
      await syncInlineImages(
        this.queries,
        this.commands,
        productId,
        product.content,
      );
    }
  }
}
