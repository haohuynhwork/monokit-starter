import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  type AuthUser,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import {
  ApiFailResponse,
  ApiZodBody,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { CreateCategoryCommand } from "../application/commands/create-category.command.js";
import { DeleteCategoryCommand } from "../application/commands/delete-category.command.js";
import { UpdateCategoryCommand } from "../application/commands/update-category.command.js";
import { ListCategoriesQuery } from "../application/queries/list-categories.query.js";
import type { CategoryView } from "../application/queries/shop.view.js";
import { CategoryNotFoundError } from "../domain/shop.errors.js";
import {
  type CreateCategoryDto,
  categoryViewSchema,
  createCategorySchema,
  type UpdateCategoryDto,
  updateCategorySchema,
} from "./shop.dto.js";

// Staff manage the category tree; the shop reads GET /shop/categories
@ApiTags("shop")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@ApiFailResponse(403, "Not an editor or admin")
@RequirePermission("shop:manage")
@Controller("categories")
export class CategoriesController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: "All categories, flat",
  })
  @ApiZodResponse(categoryViewSchema.array())
  list(): Promise<CategoryView[]> {
    return this.queries.execute(new ListCategoriesQuery());
  }

  @Post()
  @ApiOperation({
    summary: "Create a category",
  })
  @ApiZodBody(createCategorySchema)
  @ApiZodResponse(categoryViewSchema, {
    status: 201,
  })
  @ApiFailResponse(409, "Slug taken")
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createCategorySchema)) body: CreateCategoryDto,
  ): Promise<CategoryView> {
    const id = await this.commands.execute(
      new CreateCategoryCommand(body, user),
    );
    return this.get(id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Rename, reslug, reorder or move a category",
  })
  @ApiZodBody(updateCategorySchema)
  @ApiZodResponse(categoryViewSchema)
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(updateCategorySchema)) body: UpdateCategoryDto,
  ): Promise<CategoryView> {
    await this.commands.execute(new UpdateCategoryCommand(id, body, user));
    return this.get(id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete (refused while it has children or products)",
  })
  @ApiNoContentResponse()
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<void> {
    await this.commands.execute(new DeleteCategoryCommand(id, user));
  }

  private async get(id: bigint): Promise<CategoryView> {
    const all = await this.queries.execute(new ListCategoriesQuery());
    const category = all.find((c) => c.id === String(id));
    if (!category) {
      throw new CategoryNotFoundError();
    }
    return category;
  }
}
