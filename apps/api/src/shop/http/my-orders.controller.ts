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
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { type Actor, metaOf } from "../../common/domain/actor.js";
import {
  type AuthUser,
  CurrentActor,
  CurrentUser,
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
import { CancelMyOrderCommand } from "../application/commands/cancel-my-order.command.js";
import { PlaceOrderCommand } from "../application/commands/place-order.command.js";
import { GetOrderQuery } from "../application/queries/get-order.query.js";
import { ListOrdersQuery } from "../application/queries/list-orders.query.js";
import type {
  OrderSummary,
  OrderView,
} from "../application/queries/shop.view.js";
import { OrderNotFoundError } from "../domain/shop.errors.js";
import {
  type MyOrdersDto,
  myOrdersSchema,
  orderSummarySchema,
  orderViewSchema,
  type PlaceOrderDto,
  placeOrderSchema,
} from "./shop.dto.js";

// The signed-in customer's orders and checkout
@ApiTags("shop")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@Controller("me/orders")
export class MyOrdersController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Post()
  @ApiOperation({
    summary: "Check out: prices and fees come from the shop",
  })
  @ApiZodBody(placeOrderSchema)
  @ApiZodResponse(orderViewSchema, {
    status: 201,
  })
  @ApiFailResponse(409, "A product is unavailable or out of stock")
  async place(
    @CurrentUser() user: AuthUser,
    @CurrentActor() actor: Actor,
    @Body(new ZodValidationPipe(placeOrderSchema)) body: PlaceOrderDto,
  ): Promise<OrderView> {
    const id = await this.commands.execute(
      new PlaceOrderCommand(
        user.id,
        body.items,
        body.addressId,
        body.paymentMethod,
        body.note,
        body.billing ?? null,
        metaOf(actor),
      ),
    );
    return this.get(user.id, id);
  }

  @Get()
  @ApiOperation({
    summary: "My orders, newest first",
  })
  @ApiZodQuery(myOrdersSchema)
  @ApiZodPaginatedResponse(orderSummarySchema)
  async list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(myOrdersSchema)) query: MyOrdersDto,
  ): Promise<Paginated<OrderSummary>> {
    const { limit, offset, status } = query;
    const { items, total } = await this.queries.execute(
      new ListOrdersQuery(
        {
          userId: user.id,
          status,
        },
        limit,
        offset,
      ),
    );
    return new Paginated(items, {
      total,
      limit,
      offset,
    });
  }

  @Get(":id")
  @ApiOperation({
    summary: "One of my orders",
  })
  @ApiZodResponse(orderViewSchema)
  show(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<OrderView> {
    return this.get(user.id, id);
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Cancel a pending order",
  })
  @ApiZodResponse(orderViewSchema)
  @ApiFailResponse(409, "No longer pending")
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<OrderView> {
    await this.commands.execute(new CancelMyOrderCommand(user.id, id));
    return this.get(user.id, id);
  }

  private async get(userId: bigint, id: bigint): Promise<OrderView> {
    const order = await this.queries.execute(new GetOrderQuery(id, userId));
    if (!order) {
      throw new OrderNotFoundError();
    }
    return order;
  }
}
