import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { CategoryNotFoundError } from "../../domain/shop.errors.js";
import { checkStaff } from "../../domain/shop.js";
import {
  CATEGORY_REPOSITORY,
  type CategoryRepository,
} from "../../domain/shop.repository.js";
import { UpdateCategoryCommand } from "./update-category.command.js";

@CommandHandler(UpdateCategoryCommand)
export class UpdateCategoryHandler
  implements ICommandHandler<UpdateCategoryCommand>
{
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
  ) {}

  async execute({
    categoryId,
    input,
    actor,
  }: UpdateCategoryCommand): Promise<void> {
    checkStaff(actor);
    const category = await this.categories.findById(categoryId);
    if (!category) {
      throw new CategoryNotFoundError();
    }
    const { parentId, ...fields } = input;
    category.update(fields);
    if (parentId !== undefined) {
      if (parentId !== null && !(await this.categories.findById(parentId))) {
        throw new CategoryNotFoundError();
      }
      category.moveTo(
        parentId,
        parentId === null ? [] : await this.categories.ancestorIds(parentId),
      );
    }
    await this.categories.save(category);
  }
}
