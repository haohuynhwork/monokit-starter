import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  type AuthUser,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { CreateCategoryCommand } from "../application/commands/create-category.command.js";
import { DeleteCategoryCommand } from "../application/commands/delete-category.command.js";
import { UpdateCategoryCommand } from "../application/commands/update-category.command.js";
import { ListCategoriesQuery } from "../application/queries/list-categories.query.js";
import type { CategoryView } from "../application/queries/shop.view.js";
import { CategoryNotFoundError } from "../domain/shop.errors.js";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../http/shop.dto.js";
import { ShopCategoryInput } from "./catalog.input.js";
import { ShopCategoryModel } from "./catalog.model.js";

const createArgs = new ZodValidationPipe(createCategorySchema);
const updateArgs = new ZodValidationPipe(updateCategorySchema);

// Same as CategoriesController: staff manage the category tree
@RequirePermission("shop:manage")
@Resolver(() => ShopCategoryModel)
export class CategoriesResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Query(
    () => [
      ShopCategoryModel,
    ],
    {
      description: "All categories, flat (staff)",
    },
  )
  categories(): Promise<CategoryView[]> {
    return this.queries.execute(new ListCategoriesQuery());
  }

  @Mutation(() => ShopCategoryModel)
  async createCategory(
    @CurrentUser() user: AuthUser,
    @Args("input", {
      type: () => ShopCategoryInput,
    })
    input: ShopCategoryInput,
  ): Promise<CategoryView> {
    const id = await this.commands.execute(
      new CreateCategoryCommand(createArgs.transform(input), user),
    );
    return this.get(id);
  }

  @Mutation(() => ShopCategoryModel, {
    description: "Rename, reslug, reorder or move a category",
  })
  async updateCategory(
    @CurrentUser() user: AuthUser,
    @Args(
      "id",
      {
        type: () => ID,
      },
      IdPipe,
    )
    id: bigint,
    @Args("input", {
      type: () => ShopCategoryInput,
    })
    input: ShopCategoryInput,
  ): Promise<CategoryView> {
    await this.commands.execute(
      new UpdateCategoryCommand(id, updateArgs.transform(input), user),
    );
    return this.get(id);
  }

  @Mutation(() => Boolean, {
    description: "Delete (refused while it has children or products)",
  })
  async deleteCategory(
    @CurrentUser() user: AuthUser,
    @Args(
      "id",
      {
        type: () => ID,
      },
      IdPipe,
    )
    id: bigint,
  ): Promise<boolean> {
    await this.commands.execute(new DeleteCategoryCommand(id, user));
    return true;
  }

  private async get(id: bigint): Promise<CategoryView> {
    const all: CategoryView[] = await this.queries.execute(
      new ListCategoriesQuery(),
    );
    const category = all.find((c) => c.id === String(id));
    if (!category) {
      throw new CategoryNotFoundError();
    }
    return category;
  }
}
