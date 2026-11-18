import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  CategoryInUseError,
  CategoryNotFoundError,
} from "../../domain/shop.errors.js";
import { checkStaff } from "../../domain/shop.js";
import {
  CATEGORY_REPOSITORY,
  type CategoryRepository,
} from "../../domain/shop.repository.js";
import { DeleteCategoryCommand } from "./delete-category.command.js";

@CommandHandler(DeleteCategoryCommand)
export class DeleteCategoryHandler
  implements ICommandHandler<DeleteCategoryCommand>
{
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
  ) {}

  async execute({ categoryId, actor }: DeleteCategoryCommand): Promise<void> {
    checkStaff(actor);
    const category = await this.categories.findById(categoryId);
    if (!category) {
      throw new CategoryNotFoundError();
    }
    if (await this.categories.isInUse(categoryId)) {
      throw new CategoryInUseError();
    }
    category.delete(new Date());
    await this.categories.save(category);
  }
}
