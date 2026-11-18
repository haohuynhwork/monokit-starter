import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Args, ID, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { page } from "../../common/graphql/paginated.js";
import {
  type AuthUser,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
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
  createProductSchema,
  listProductsSchema,
  productImagesSchema,
  updateProductSchema,
} from "../http/shop.dto.js";
import { ShopProductImagesInput, ShopProductInput } from "./catalog.input.js";
import { ShopProductModel, ShopProductPage } from "./catalog.model.js";

const listArgs = new ZodValidationPipe(listProductsSchema);
const createArgs = new ZodValidationPipe(createProductSchema);
const updateArgs = new ZodValidationPipe(updateProductSchema);
const imagesArgs = new ZodValidationPipe(productImagesSchema);
const idArg = {
  type: () => ID,
} as const;

// Same as ProductsController: the panel's products, any status
@RequirePermission("shop:manage")
@Resolver(() => ShopProductModel)
export class ProductsResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Query(() => ShopProductPage, {
    description: "List products, any status (search name/SKU with q)",
  })
  async products(
    @Args("status", {
      type: () => String,
      nullable: true,
    })
    status?: string,
    @Args("q", {
      type: () => String,
      nullable: true,
    })
    q?: string,
    @Args("categoryId", {
      type: () => ID,
      nullable: true,
    })
    categoryId?: string,
    @Args("sort", {
      type: () => String,
      nullable: true,
      description: "newest (default), price_asc, price_desc or name",
    })
    sort?: string,
    @Args("limit", {
      type: () => Int,
      nullable: true,
    })
    limit?: number,
    @Args("offset", {
      type: () => Int,
      nullable: true,
    })
    offset?: number,
  ) {
    const query = listArgs.transform({
      status: status ?? undefined,
      q: q ?? undefined,
      categoryId: categoryId ?? undefined,
      sort: sort ?? undefined,
      limit: limit ?? undefined,
      offset: offset ?? undefined,
    });
    const { limit: l, offset: o, sort: s, ...filter } = query;
    const { items, total } = await this.queries.execute(
      new ListProductsQuery(filter, s, l, o),
    );
    return page(
      new Paginated(items, {
        total,
        limit: l,
        offset: o,
      }),
    );
  }

  @Query(() => ShopProductModel, {
    description: "A product, any status",
  })
  product(@Args("id", idArg, IdPipe) id: bigint): Promise<ProductView> {
    return this.get(id);
  }

  @Mutation(() => ShopProductModel, {
    description: "Create a product (a draft unless status is set)",
  })
  async createProduct(
    @CurrentUser() user: AuthUser,
    @Args("input", {
      type: () => ShopProductInput,
    })
    input: ShopProductInput,
  ): Promise<ProductView> {
    const id = await this.commands.execute(
      new CreateProductCommand(createArgs.transform(input), user),
    );
    return this.get(id);
  }

  @Mutation(() => ShopProductModel)
  async updateProduct(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
    @Args("input", {
      type: () => ShopProductInput,
    })
    input: ShopProductInput,
  ): Promise<ProductView> {
    await this.commands.execute(
      new UpdateProductCommand(id, updateArgs.transform(input), user),
    );
    return this.get(id);
  }

  @Mutation(() => ShopProductModel, {
    description:
      "Set the cover, the ordered gallery, and variant and option value images (null removes)",
  })
  async setProductImages(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
    @Args("input", {
      type: () => ShopProductImagesInput,
    })
    input: ShopProductImagesInput,
  ): Promise<ProductView> {
    const body = imagesArgs.transform(input);
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

  @Mutation(() => ID, {
    description:
      "The product's folder id in the media library (created on first use)",
  })
  async ensureProductFolder(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<string> {
    const folderId = await this.commands.execute(
      new EnsureProductFolderCommand(id, user),
    );
    return String(folderId);
  }

  @Mutation(() => Boolean, {
    description: "Delete (orders keep their copies)",
  })
  async deleteProduct(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<boolean> {
    await this.commands.execute(new DeleteProductCommand(id, user));
    return true;
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
