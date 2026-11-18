import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { Category } from "../../domain/category.js";
import { CategoryNotFoundError } from "../../domain/shop.errors.js";
import { checkStaff } from "../../domain/shop.js";
import {
  CATEGORY_REPOSITORY,
  type CategoryRepository,
} from "../../domain/shop.repository.js";
import { CreateCategoryCommand } from "./create-category.command.js";

@CommandHandler(CreateCategoryCommand)
export class CreateCategoryHandler
  implements ICommandHandler<CreateCategoryCommand>
{
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
  ) {}

  async execute({ input, actor }: CreateCategoryCommand): Promise<bigint> {
    checkStaff(actor);
    if (
      input.parentId !== null &&
      !(await this.categories.findById(input.parentId))
    ) {
      throw new CategoryNotFoundError();
    }
    const category = Category.create(input);
    await this.categories.save(category);
    return category.id!;
  }
}
