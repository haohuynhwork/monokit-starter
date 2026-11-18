import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  type AuthUser,
  CurrentUser,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { AddToWishlistCommand } from "../application/commands/add-to-wishlist.command.js";
import { MergeWishlistCommand } from "../application/commands/merge-wishlist.command.js";
import { RemoveFromWishlistCommand } from "../application/commands/remove-from-wishlist.command.js";
import { ListWishlistQuery } from "../application/queries/list-wishlist.query.js";
import { ListWishlistIdsQuery } from "../application/queries/list-wishlist-ids.query.js";
import type { ProductView } from "../application/queries/shop.view.js";
import { type ProductIdsDto, productIdsSchema } from "../http/shop.dto.js";
import { ShopProductModel } from "./catalog.model.js";

const productIdArg = {
  type: () => ID,
} as const;

// Same as MyWishlistController: products the signed-in customer saved
@Resolver(() => ShopProductModel)
export class MyWishlistResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Query(
    () => [
      ShopProductModel,
    ],
    {
      description: "My saved products, newest first (off-sale ones stay)",
    },
  )
  myWishlist(@CurrentUser() user: AuthUser): Promise<ProductView[]> {
    return this.queries.execute(new ListWishlistQuery(user.id));
  }

  @Query(
    () => [
      ID,
    ],
    {
      description: "Ids of my saved products, to mark them in listings",
    },
  )
  myWishlistIds(@CurrentUser() user: AuthUser): Promise<string[]> {
    return this.queries.execute(new ListWishlistIdsQuery(user.id));
  }

  @Mutation(() => Boolean, {
    description:
      "Add a guest's saved products at login (off-sale ones skipped)",
  })
  async mergeMyWishlist(
    @CurrentUser() user: AuthUser,
    @Args(
      "productIds",
      {
        type: () => [
          ID,
        ],
      },
      new ZodValidationPipe(productIdsSchema.shape.productIds),
    )
    productIds: ProductIdsDto["productIds"],
  ): Promise<boolean> {
    await this.commands.execute(new MergeWishlistCommand(user.id, productIds));
    return true;
  }

  @Mutation(() => Boolean, {
    description: "Save a product (saving again is fine)",
  })
  async addToMyWishlist(
    @CurrentUser() user: AuthUser,
    @Args("productId", productIdArg, IdPipe) productId: bigint,
  ): Promise<boolean> {
    await this.commands.execute(new AddToWishlistCommand(user.id, productId));
    return true;
  }

  @Mutation(() => Boolean, {
    description: "Remove a saved product",
  })
  async removeFromMyWishlist(
    @CurrentUser() user: AuthUser,
    @Args("productId", productIdArg, IdPipe) productId: bigint,
  ): Promise<boolean> {
    await this.commands.execute(
      new RemoveFromWishlistCommand(user.id, productId),
    );
    return true;
  }
}
