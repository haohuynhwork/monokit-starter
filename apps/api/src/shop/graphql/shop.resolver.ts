import { QueryBus } from "@nestjs/cqrs";
import { Args, ID, Int, Query, Resolver } from "@nestjs/graphql";
import { page } from "../../common/graphql/paginated.js";
import { Public } from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import { Paginated } from "../../common/http/responses/paginated.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { GetProductQuery } from "../application/queries/get-product.query.js";
import { ListCategoriesQuery } from "../application/queries/list-categories.query.js";
import { ListGuestWishlistQuery } from "../application/queries/list-guest-wishlist.query.js";
import { ListProductsQuery } from "../application/queries/list-products.query.js";
import { ListRatingsQuery } from "../application/queries/list-ratings.query.js";
import { PriceCartQuery } from "../application/queries/price-cart.query.js";
import {
  type CartView,
  type CategoryView,
  type ProductView,
  toPublicProduct,
} from "../application/queries/shop.view.js";
import { ProductNotFoundError } from "../domain/shop.errors.js";
import {
  cartLinesSchema,
  pageSchema,
  productIdsSchema,
  shopProductsSchema,
} from "../http/shop.dto.js";
import {
  ShopCartLineInput,
  ShopCartModel,
  ShopCategoryModel,
  ShopProductModel,
  ShopProductPage,
  ShopRatingPage,
} from "./catalog.model.js";

const productsArgs = new ZodValidationPipe(shopProductsSchema);
const pageArgs = new ZodValidationPipe(pageSchema);
const cartArgs = new ZodValidationPipe(cartLinesSchema);
const idsArgs = new ZodValidationPipe(productIdsSchema);

// Same reads as ShopController: active products only, no sign-in
@Public()
@Resolver(() => ShopProductModel)
export class ShopResolver {
  constructor(private readonly queries: QueryBus) {}

  @Query(
    () => [
      ShopCategoryModel,
    ],
    {
      description: "All categories, flat; build the tree from parentId",
    },
  )
  shopCategories(): Promise<CategoryView[]> {
    return this.queries.execute(new ListCategoriesQuery());
  }

  @Query(() => ShopProductPage, {
    description: "Active products",
  })
  async shopProducts(
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
    const query = productsArgs.transform({
      q: q ?? undefined,
      categoryId: categoryId ?? undefined,
      sort: sort ?? undefined,
      limit: limit ?? undefined,
      offset: offset ?? undefined,
    });
    const { limit: l, offset: o, sort: s, ...filter } = query;
    const { items, total } = await this.queries.execute(
      new ListProductsQuery(
        {
          ...filter,
          status: "active",
        },
        s,
        l,
        o,
      ),
    );
    return page(
      new Paginated((items as ProductView[]).map(toPublicProduct), {
        total,
        limit: l,
        offset: o,
      }),
    );
  }

  @Query(() => ShopProductModel, {
    description: "An active product by slug, with its gallery",
  })
  async shopProduct(
    @Args("slug", {
      type: () => String,
    })
    slug: string,
  ): Promise<ProductView> {
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

  @Query(() => ShopRatingPage, {
    description: "A product's ratings, newest first",
  })
  async productRatings(
    @Args(
      "productId",
      {
        type: () => ID,
      },
      IdPipe,
    )
    productId: bigint,
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
    const query = pageArgs.transform({
      limit: limit ?? undefined,
      offset: offset ?? undefined,
    });
    const { items, total } = await this.queries.execute(
      new ListRatingsQuery(productId, query.limit, query.offset),
    );
    return page(
      new Paginated(items, {
        total,
        ...query,
      }),
    );
  }

  @Query(() => ShopCartModel, {
    description: "Price a guest's cart (kept by the browser) as it stands now",
  })
  priceCart(
    @Args("items", {
      type: () => [
        ShopCartLineInput,
      ],
    })
    items: ShopCartLineInput[],
  ): Promise<CartView> {
    return this.queries.execute(
      new PriceCartQuery(
        cartArgs.transform({
          items,
        }).items,
      ),
    );
  }

  @Query(
    () => [
      ShopProductModel,
    ],
    {
      description:
        "A guest's saved products (kept by the browser), in their order",
    },
  )
  guestWishlist(
    @Args("productIds", {
      type: () => [
        ID,
      ],
    })
    productIds: string[],
  ): Promise<ProductView[]> {
    return this.queries.execute(
      new ListGuestWishlistQuery(
        idsArgs.transform({
          productIds,
        }).productIds,
      ),
    );
  }
}
