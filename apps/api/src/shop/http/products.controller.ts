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
  Put,
  Query,
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
  ApiZodPaginatedResponse,
  ApiZodQuery,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { Paginated } from "../../common/http/responses/paginated.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { CreateProductCommand } from "../application/commands/create-product.command.js";
import { DeleteProductCommand } from "../application/commands/delete-product.command.js";
import { EnsureProductFolderCommand } from "../application/commands/ensure-product-folder.command.js";
import { SetProductImagesCommand } from "../application/commands/set-product-images.command.js";
import { UpdateProductCommand } from "../application/commands/update-product.command.js";
import { GetProductQuery } from "../application/queries/get-product.query.js";
import { ListProductsQuery } from "../application/queries/list-products.query.js";
import type { ProductView } from "../application/queries/shop.view.js";
import { ProductNotFoundError } from "../domain/shop.errors.js";
import {
  type CreateProductDto,
  createProductSchema,
  folderSchema,
  type ListProductsDto,
  listProductsSchema,
  type ProductImagesDto,
  productImagesSchema,
  productViewSchema,
  type UpdateProductDto,
  updateProductSchema,
} from "./shop.dto.js";

// The panel's products, any status
@ApiTags("shop")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@ApiFailResponse(403, "Not an editor or admin")
@RequirePermission("shop:manage")
@Controller("products")
export class ProductsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List products (search name/SKU with q)",
  })
  @ApiZodQuery(listProductsSchema)
  @ApiZodPaginatedResponse(productViewSchema)
  async list(
    @Query(new ZodValidationPipe(listProductsSchema)) query: ListProductsDto,
  ): Promise<Paginated<ProductView>> {
    const { limit, offset, sort, ...filter } = query;
    const { items, total } = await this.queries.execute(
      new ListProductsQuery(filter, sort, limit, offset),
    );
    return new Paginated(items, {
      total,
      limit,
      offset,
    });
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a product",
  })
  @ApiZodResponse(productViewSchema)
  show(@Param("id", IdPipe) id: bigint): Promise<ProductView> {
    return this.get(id);
  }

  @Post()
  @ApiOperation({
    summary: "Create a product (a draft unless status is set)",
  })
  @ApiZodBody(createProductSchema)
  @ApiZodResponse(productViewSchema, {
    status: 201,
  })
  @ApiFailResponse(409, "Slug or SKU taken")
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createProductSchema)) body: CreateProductDto,
  ): Promise<ProductView> {
    const id = await this.commands.execute(
      new CreateProductCommand(body, user),
    );
    return this.get(id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Edit a product",
  })
  @ApiZodBody(updateProductSchema)
  @ApiZodResponse(productViewSchema)
  @ApiFailResponse(409, "Slug or SKU taken")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductDto,
  ): Promise<ProductView> {
    await this.commands.execute(new UpdateProductCommand(id, body, user));
    return this.get(id);
  }

  @Put(":id/images")
  @ApiOperation({
    summary:
      "Set the cover, the ordered gallery, and variant and option value images (null removes)",
  })
  @ApiZodBody(productImagesSchema)
  @ApiZodResponse(productViewSchema)
  @ApiFailResponse(400, "invalid_variant_image: not one of the product photos")
  async images(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(productImagesSchema)) body: ProductImagesDto,
  ): Promise<ProductView> {
    await this.commands.execute(
      new SetProductImagesCommand(
        id,
        {
          ...body,
          variants:
            body.variants &&
            new Map(
              Object.entries(body.variants).map(([k, v]) => [
                BigInt(k),
                v,
              ]),
            ),
        },
        user,
      ),
    );
    return this.get(id);
  }

  @Post(":id/folder")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "The product's folder in the media library (created on first use)",
  })
  @ApiZodResponse(folderSchema)
  async folder(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<{
    folderId: string;
  }> {
    const folderId = await this.commands.execute(
      new EnsureProductFolderCommand(id, user),
    );
    return {
      folderId: String(folderId),
    };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete (orders keep their copies)",
  })
  @ApiNoContentResponse()
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<void> {
    await this.commands.execute(new DeleteProductCommand(id, user));
  }

  private async get(id: bigint): Promise<ProductView> {
    const product = await this.queries.execute(
      new GetProductQuery({
        id,
      }),
    );
    if (!product) {
      throw new ProductNotFoundError();
    }
    return product;
  }
}
