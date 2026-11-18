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
import { ChangeOrderPaymentCommand } from "../application/commands/change-order-payment.command.js";
import { ChangeOrderStatusCommand } from "../application/commands/change-order-status.command.js";
import { GetOrderQuery } from "../application/queries/get-order.query.js";
import { ListOrdersQuery } from "../application/queries/list-orders.query.js";
import type { OrderView } from "../application/queries/shop.view.js";
import { OrderNotFoundError } from "../domain/shop.errors.js";
import {
  listOrdersSchema,
  orderPaymentSchema,
  orderStatusSchema,
} from "../http/shop.dto.js";
import { ShopOrderModel, ShopOrderSummaryPage } from "./catalog.model.js";

const listArgs = new ZodValidationPipe(listOrdersSchema);
const statusArgs = new ZodValidationPipe(orderStatusSchema);
const paymentArgs = new ZodValidationPipe(orderPaymentSchema);
const idArg = {
  type: () => ID,
} as const;

// Same as OrdersController: staff handle every order
@RequirePermission("shop:manage")
@Resolver(() => ShopOrderModel)
export class OrdersResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Query(() => ShopOrderSummaryPage, {
    description: "All orders; q is an order number or recipient name/phone",
  })
  async orders(
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
      limit: limit ?? undefined,
      offset: offset ?? undefined,
    });
    const { limit: l, offset: o, ...filter } = query;
    const { items, total } = await this.queries.execute(
      new ListOrdersQuery(filter, l, o),
    );
    return page(
      new Paginated(items, {
        total,
        limit: l,
        offset: o,
      }),
    );
  }

  @Query(() => ShopOrderModel, {
    description: "An order with items and timeline",
  })
  order(@Args("id", idArg, IdPipe) id: bigint): Promise<OrderView> {
    return this.get(id);
  }

  @Mutation(() => ShopOrderModel, {
    description: "Move the order along (tracking when shipping)",
  })
  async changeOrderStatus(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
    @Args("status", {
      type: () => String,
    })
    status: string,
    @Args("trackingNumber", {
      type: () => String,
      nullable: true,
    })
    trackingNumber?: string | null,
  ): Promise<OrderView> {
    const body = statusArgs.transform({
      status,
      trackingNumber,
    });
    await this.commands.execute(
      new ChangeOrderStatusCommand(id, body.status, body.trackingNumber, user),
    );
    return this.get(id);
  }

  @Mutation(() => ShopOrderModel, {
    description: "Record payment: paid, refunded or unpaid",
  })
  async changeOrderPayment(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
    @Args("paymentStatus", {
      type: () => String,
    })
    paymentStatus: string,
  ): Promise<OrderView> {
    const body = paymentArgs.transform({
      paymentStatus,
    });
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
