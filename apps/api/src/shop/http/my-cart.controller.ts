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
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  type AuthUser,
  CurrentUser,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import {
  ApiFailResponse,
  ApiZodBody,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
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
  cartViewSchema,
  type SetCartQuantityDto,
  setCartQuantitySchema,
} from "./shop.dto.js";

// The signed-in customer's cart. Every change answers with the whole cart.
// Checkout is POST /me/orders; what it orders leaves the cart.
@ApiTags("shop")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@Controller("me/cart")
export class MyCartController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: "My cart, with today's prices and stock",
  })
  @ApiZodResponse(cartViewSchema)
  show(@CurrentUser() user: AuthUser): Promise<CartView> {
    return this.queries.execute(new GetCartQuery(user.id));
  }

  @Post("items")
  @ApiOperation({
    summary: "Add a variant (adds to its quantity if already there)",
  })
  @ApiZodBody(addToCartSchema)
  @ApiZodResponse(cartViewSchema, {
    status: 201,
  })
  @ApiFailResponse(409, "Not for sale, or not enough in stock")
  async add(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(addToCartSchema)) body: AddToCartDto,
  ): Promise<CartView> {
    await this.commands.execute(
      new AddToCartCommand(user.id, body.variantId, body.quantity),
    );
    return this.show(user);
  }

  @Post("merge")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Add a guest's cart at login (unorderable lines skipped, quantities capped)",
  })
  @ApiZodBody(cartLinesSchema)
  @ApiZodResponse(cartViewSchema)
  async merge(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(cartLinesSchema)) body: CartLinesDto,
  ): Promise<CartView> {
    await this.commands.execute(new MergeCartCommand(user.id, body.items));
    return this.show(user);
  }

  @Patch("items/:variantId")
  @ApiOperation({
    summary: "Change a line's quantity",
  })
  @ApiZodBody(setCartQuantitySchema)
  @ApiZodResponse(cartViewSchema)
  @ApiFailResponse(409, "Not for sale, or not enough in stock")
  async setQuantity(
    @CurrentUser() user: AuthUser,
    @Param("variantId", IdPipe) variantId: bigint,
    @Body(new ZodValidationPipe(setCartQuantitySchema))
    body: SetCartQuantityDto,
  ): Promise<CartView> {
    await this.commands.execute(
      new SetCartQuantityCommand(user.id, variantId, body.quantity),
    );
    return this.show(user);
  }

  @Delete("items/:variantId")
  @ApiOperation({
    summary: "Remove a line",
  })
  @ApiZodResponse(cartViewSchema)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("variantId", IdPipe) variantId: bigint,
  ): Promise<CartView> {
    await this.commands.execute(
      new RemoveFromCartCommand(user.id, [
        variantId,
      ]),
    );
    return this.show(user);
  }

  @Delete()
  @ApiOperation({
    summary: "Empty the cart",
  })
  @ApiZodResponse(cartViewSchema)
  async clear(@CurrentUser() user: AuthUser): Promise<CartView> {
    await this.commands.execute(new RemoveFromCartCommand(user.id, null));
    return this.show(user);
  }
}
