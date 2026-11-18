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
import { Product } from "../../domain/product.js";
import { CategoryNotFoundError } from "../../domain/shop.errors.js";
import { checkStaff } from "../../domain/shop.js";
import {
  CATEGORY_REPOSITORY,
  type CategoryRepository,
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from "../../domain/shop.repository.js";
import { syncInlineImages } from "../product-content.js";
import { CreateProductCommand } from "./create-product.command.js";

@CommandHandler(CreateProductCommand)
export class CreateProductHandler
  implements ICommandHandler<CreateProductCommand>
{
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
    @Inject(HTML_SANITIZER) private readonly sanitizer: HtmlSanitizer,
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  async execute({ input, actor }: CreateProductCommand): Promise<bigint> {
    checkStaff(actor);
    if (
      input.categoryId &&
      !(await this.categories.findById(input.categoryId))
    ) {
      throw new CategoryNotFoundError();
    }
    const product = Product.create(
      {
        ...input,
        ...(input.content !== undefined && {
          content: this.sanitizer.sanitize(input.content),
        }),
      },
      // Seeds act as id 0, which is no user
      actor.id > 0n ? actor.id : null,
    );
    await this.products.save(product);
    if (product.content) {
      await syncInlineImages(
        this.queries,
        this.commands,
        product.id!,
        product.content,
      );
    }
    return product.id!;
  }
}
