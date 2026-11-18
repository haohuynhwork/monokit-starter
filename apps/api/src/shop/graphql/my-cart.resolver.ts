import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Args, ID, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  type AuthUser,
  CurrentUser,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { AddToCartCommand } from "../application/commands/add-to-cart.command.js";
import { MergeCartCommand } from "../application/commands/merge-cart.command.js";
import { RemoveFromCartCommand } from "../application/commands/remove-from-cart.command.js";
import { SetCartQuantityCommand } from "../application/commands/set-cart-quantity.command.js";
import { GetCartQuery } from "../application/queries/get-cart.query.js";
import type { CartView } from "../application/queries/shop.view.js";
import {
  type AddToCartDto,
  addToCartSchema,
  type CartLinesDto,
  cartLinesSchema,
  type SetCartQuantityDto,
  setCartQuantitySchema,
} from "../http/shop.dto.js";
import { ShopCartLineInput, ShopCartModel } from "./catalog.model.js";

const variantIdArg = {
  type: () => ID,
} as const;

// Same as MyCartController: the signed-in customer's cart; every change
// answers with the whole cart
@Resolver(() => ShopCartModel)
export class MyCartResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Query(() => ShopCartModel, {
    description: "My cart, with today's prices and stock",
  })
  myCart(@CurrentUser() user: AuthUser): Promise<CartView> {
    return this.queries.execute(new GetCartQuery(user.id));
  }

  @Mutation(() => ShopCartModel, {
    description: "Add a variant (adds to its quantity if already there)",
  })
  async addToMyCart(
    @CurrentUser() user: AuthUser,
    @Args("variantId", variantIdArg)
    variantId: string,
    @Args("quantity", {
      type: () => Int,
      nullable: true,
    })
    quantity?: number,
  ): Promise<CartView> {
    const body: AddToCartDto = new ZodValidationPipe(addToCartSchema).transform(
      {
        variantId,
        quantity: quantity ?? undefined,
      },
    );
    await this.commands.execute(
      new AddToCartCommand(user.id, body.variantId, body.quantity),
    );
    return this.myCart(user);
  }

  @Mutation(() => ShopCartModel, {
    description:
      "Add a guest's cart at login (unorderable lines skipped, quantities capped)",
  })
  async mergeMyCart(
    @CurrentUser() user: AuthUser,
    @Args(
      "items",
      {
        type: () => [
          ShopCartLineInput,
        ],
      },
      new ZodValidationPipe(cartLinesSchema.shape.items),
    )
    items: CartLinesDto["items"],
  ): Promise<CartView> {
    await this.commands.execute(new MergeCartCommand(user.id, items));
    return this.myCart(user);
  }

  @Mutation(() => ShopCartModel, {
    description: "Change a line's quantity",
  })
  async setMyCartQuantity(
    @CurrentUser() user: AuthUser,
    @Args("variantId", variantIdArg, IdPipe) variantId: bigint,
    @Args("quantity", {
      type: () => Int,
    })
    quantity: number,
  ): Promise<CartView> {
    const body: SetCartQuantityDto = new ZodValidationPipe(
      setCartQuantitySchema,
    ).transform({
      quantity,
    });
    await this.commands.execute(
      new SetCartQuantityCommand(user.id, variantId, body.quantity),
    );
    return this.myCart(user);
  }

  @Mutation(() => ShopCartModel, {
    description: "Remove a line",
  })
  async removeFromMyCart(
    @CurrentUser() user: AuthUser,
    @Args("variantId", variantIdArg, IdPipe) variantId: bigint,
  ): Promise<CartView> {
    await this.commands.execute(
      new RemoveFromCartCommand(user.id, [
        variantId,
      ]),
    );
    return this.myCart(user);
  }

  @Mutation(() => ShopCartModel, {
    description: "Empty the cart",
  })
  async clearMyCart(@CurrentUser() user: AuthUser): Promise<CartView> {
    await this.commands.execute(new RemoveFromCartCommand(user.id, null));
    return this.myCart(user);
  }
}
