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
import { ChangeOrderPaymentCommand } from "../application/commands/change-order-payment.command.js";
import { ChangeOrderStatusCommand } from "../application/commands/change-order-status.command.js";
import { GetOrderQuery } from "../application/queries/get-order.query.js";
import { ListOrdersQuery } from "../application/queries/list-orders.query.js";
import type {
  OrderSummary,
  OrderView,
} from "../application/queries/shop.view.js";
import { OrderNotFoundError } from "../domain/shop.errors.js";
import {
  type ListOrdersDto,
  listOrdersSchema,
  type OrderPaymentDto,
  type OrderStatusDto,
  orderPaymentSchema,
  orderStatusSchema,
  orderSummarySchema,
  orderViewSchema,
} from "./shop.dto.js";

// Staff handle every order
@ApiTags("shop")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@ApiFailResponse(403, "Not an editor or admin")
@RequirePermission("shop:manage")
@Controller("orders")
export class OrdersController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: "All orders; q is an order number or recipient name/phone",
  })
  @ApiZodQuery(listOrdersSchema)
  @ApiZodPaginatedResponse(orderSummarySchema)
  async list(
    @Query(new ZodValidationPipe(listOrdersSchema)) query: ListOrdersDto,
  ): Promise<Paginated<OrderSummary>> {
    const { limit, offset, ...filter } = query;
    const { items, total } = await this.queries.execute(
      new ListOrdersQuery(filter, limit, offset),
    );
    return new Paginated(items, {
      total,
      limit,
      offset,
    });
  }

  @Get(":id")
  @ApiOperation({
    summary: "An order with items and timeline",
  })
  @ApiZodResponse(orderViewSchema)
  show(@Param("id", IdPipe) id: bigint): Promise<OrderView> {
    return this.get(id);
  }

  @Post(":id/status")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Move the order along (tracking when shipping)",
  })
  @ApiZodBody(orderStatusSchema)
  @ApiZodResponse(orderViewSchema)
  @ApiFailResponse(409, "Transition not allowed, or changed meanwhile")
  async status(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(orderStatusSchema)) body: OrderStatusDto,
  ): Promise<OrderView> {
    await this.commands.execute(
      new ChangeOrderStatusCommand(id, body.status, body.trackingNumber, user),
    );
    return this.get(id);
  }

  @Post(":id/payment")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Record payment: paid, refunded or unpaid",
  })
  @ApiZodBody(orderPaymentSchema)
  @ApiZodResponse(orderViewSchema)
  async payment(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(orderPaymentSchema)) body: OrderPaymentDto,
  ): Promise<OrderView> {
    await this.commands.execute(
      new ChangeOrderPaymentCommand(id, body.paymentStatus, user),
    );
    return this.get(id);
  }

  private async get(id: bigint): Promise<OrderView> {
    const order = await this.queries.execute(new GetOrderQuery(id));
    if (!order) {
      throw new OrderNotFoundError();
    }
    return order;
  }
}
