import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Args, ID, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { page } from "../../common/graphql/paginated.js";
import {
  type AuthUser,
  CurrentUser,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
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
  type PlaceOrderDto,
  placeOrderSchema,
} from "../http/shop.dto.js";
import { ShopPlaceOrderInput } from "./account.model.js";
import { ShopOrderModel, ShopOrderSummaryPage } from "./catalog.model.js";

const idArg = {
  type: () => ID,
} as const;

// Same as MyOrdersController: the signed-in customer's orders and checkout
@Resolver(() => ShopOrderModel)
export class MyOrdersResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Mutation(() => ShopOrderModel, {
    description: "Check out: prices and fees come from the shop",
  })
  async placeOrder(
    @CurrentUser() user: AuthUser,
    @Args(
      "input",
      {
        type: () => ShopPlaceOrderInput,
      },
      new ZodValidationPipe(placeOrderSchema),
    )
    body: PlaceOrderDto,
  ): Promise<OrderView> {
    const id = await this.commands.execute(
      new PlaceOrderCommand(
        user.id,
        body.items,
        body.addressId,
        body.paymentMethod,
        body.note,
        body.billing ?? null,
      ),
    );
    return this.get(user.id, id);
  }

  @Query(() => ShopOrderSummaryPage, {
    description: "My orders, newest first",
  })
  async myOrders(
    @CurrentUser() user: AuthUser,
    @Args("status", {
      type: () => String,
      nullable: true,
    })
    status?: string,
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
    const query: MyOrdersDto = new ZodValidationPipe(myOrdersSchema).transform({
      status: status ?? undefined,
      limit: limit ?? undefined,
      offset: offset ?? undefined,
    });
    const { items, total } = await this.queries.execute(
      new ListOrdersQuery(
        {
          userId: user.id,
          status: query.status,
        },
        query.limit,
        query.offset,
      ),
    );
    return page(
      new Paginated<OrderSummary>(items, {
        total,
        limit: query.limit,
        offset: query.offset,
      }),
    );
  }

  @Query(() => ShopOrderModel, {
    description: "One of my orders",
  })
  myOrder(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<OrderView> {
    return this.get(user.id, id);
  }

  @Mutation(() => ShopOrderModel, {
    description: "Cancel a pending order",
  })
  async cancelMyOrder(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
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
