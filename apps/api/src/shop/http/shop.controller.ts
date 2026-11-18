import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/http/guards/auth.decorators.js";
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
import { GetProductQuery } from "../application/queries/get-product.query.js";
import { ListCategoriesQuery } from "../application/queries/list-categories.query.js";
import { ListGuestWishlistQuery } from "../application/queries/list-guest-wishlist.query.js";
import { ListProductsQuery } from "../application/queries/list-products.query.js";
import { ListRatingsQuery } from "../application/queries/list-ratings.query.js";
import { PriceCartQuery } from "../application/queries/price-cart.query.js";
import type {
  CartView,
  CategoryView,
  ProductView,
  RatingView,
} from "../application/queries/shop.view.js";
import { toPublicProduct } from "../application/queries/shop.view.js";
import { ProductNotFoundError } from "../domain/shop.errors.js";
import {
  type CartLinesDto,
  cartLinesSchema,
  cartViewSchema,
  categoryViewSchema,
  type PageDto,
  type ProductIdsDto,
  pageSchema,
  productIdsSchema,
  productViewSchema,
  ratingViewSchema,
  type ShopProductsDto,
  shopProductsSchema,
} from "./shop.dto.js";

// What the storefront reads: active products only, no sign-in
@ApiTags("public")
@Public()
@Controller("shop")
export class ShopController {
  constructor(private readonly queries: QueryBus) {}

  @Get("categories")
  @ApiOperation({
    summary: "All categories, flat; build the tree from parentId",
  })
  @ApiZodResponse(categoryViewSchema.array())
  categories(): Promise<CategoryView[]> {
    return this.queries.execute(new ListCategoriesQuery());
  }

  @Get("products")
  @ApiOperation({
    summary: "Active products",
  })
  @ApiZodQuery(shopProductsSchema)
  @ApiZodPaginatedResponse(productViewSchema)
  async products(
    @Query(new ZodValidationPipe(shopProductsSchema)) query: ShopProductsDto,
  ): Promise<Paginated<ProductView>> {
    const { limit, offset, sort, ...filter } = query;
    const { items, total } = await this.queries.execute(
      new ListProductsQuery(
        {
          ...filter,
          status: "active",
        },
        sort,
        limit,
        offset,
      ),
    );
    return new Paginated(items.map(toPublicProduct), {
      total,
      limit,
      offset,
    });
  }

  @Get("products/:slug")
  @ApiOperation({
    summary: "An active product by slug, with its gallery",
  })
  @ApiZodResponse(productViewSchema)
  @ApiFailResponse(404, "No active product with this slug")
  async product(@Param("slug") slug: string): Promise<ProductView> {
    const product = await this.queries.execute(
      new GetProductQuery(
        {
          slug,
        },
        true,
      ),
    );
    if (!product) {
      throw new ProductNotFoundError();
    }
    return toPublicProduct(product);
  }

  @Get("products/:id/ratings")
  @ApiOperation({
    summary: "A product's ratings, newest first",
  })
  @ApiZodQuery(pageSchema)
  @ApiZodPaginatedResponse(ratingViewSchema)
  async ratings(
    @Param("id", IdPipe) id: bigint,
    @Query(new ZodValidationPipe(pageSchema)) query: PageDto,
  ): Promise<Paginated<RatingView>> {
    const { items, total } = await this.queries.execute(
      new ListRatingsQuery(id, query.limit, query.offset),
    );
    return new Paginated(items, {
      total,
      ...query,
    });
  }

  @Post("cart")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Price a guest's cart (kept by the browser) as it stands now",
  })
  @ApiZodBody(cartLinesSchema)
  @ApiZodResponse(cartViewSchema)
  priceCart(
    @Body(new ZodValidationPipe(cartLinesSchema)) body: CartLinesDto,
  ): Promise<CartView> {
    return this.queries.execute(new PriceCartQuery(body.items));
  }

  @Post("wishlist")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "A guest's saved products (kept by the browser), in their order",
  })
  @ApiZodBody(productIdsSchema)
  @ApiZodResponse(productViewSchema.array())
  guestWishlist(
    @Body(new ZodValidationPipe(productIdsSchema)) body: ProductIdsDto,
  ): Promise<ProductView[]> {
    return this.queries.execute(new ListGuestWishlistQuery(body.productIds));
  }
}
