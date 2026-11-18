import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { z } from "zod";
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
import { AddToWishlistCommand } from "../application/commands/add-to-wishlist.command.js";
import { MergeWishlistCommand } from "../application/commands/merge-wishlist.command.js";
import { RemoveFromWishlistCommand } from "../application/commands/remove-from-wishlist.command.js";
import { ListWishlistQuery } from "../application/queries/list-wishlist.query.js";
import { ListWishlistIdsQuery } from "../application/queries/list-wishlist-ids.query.js";
import type { ProductView } from "../application/queries/shop.view.js";
import {
  type ProductIdsDto,
  productIdsSchema,
  productViewSchema,
} from "./shop.dto.js";

// Products the signed-in customer saved for later
@ApiTags("shop")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@Controller("me/wishlist")
export class MyWishlistController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: "My saved products, newest first (off-sale ones stay)",
  })
  @ApiZodResponse(productViewSchema.array())
  list(@CurrentUser() user: AuthUser): Promise<ProductView[]> {
    return this.queries.execute(new ListWishlistQuery(user.id));
  }

  @Get("ids")
  @ApiOperation({
    summary: "Ids of my saved products, to mark them in listings",
  })
  @ApiZodResponse(z.array(z.string()))
  ids(@CurrentUser() user: AuthUser): Promise<string[]> {
    return this.queries.execute(new ListWishlistIdsQuery(user.id));
  }

  @Post("merge")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Add a guest's saved products at login (off-sale ones skipped)",
  })
  @ApiZodBody(productIdsSchema)
  @ApiNoContentResponse()
  async merge(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(productIdsSchema)) body: ProductIdsDto,
  ): Promise<void> {
    await this.commands.execute(
      new MergeWishlistCommand(user.id, body.productIds),
    );
  }

  @Put(":productId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Save a product (saving again is fine)",
  })
  @ApiNoContentResponse()
  @ApiFailResponse(404, "No such product on sale")
  async add(
    @CurrentUser() user: AuthUser,
    @Param("productId", IdPipe) productId: bigint,
  ): Promise<void> {
    await this.commands.execute(new AddToWishlistCommand(user.id, productId));
  }

  @Delete(":productId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Remove a saved product",
  })
  @ApiNoContentResponse()
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("productId", IdPipe) productId: bigint,
  ): Promise<void> {
    await this.commands.execute(
      new RemoveFromWishlistCommand(user.id, productId),
    );
  }
}
