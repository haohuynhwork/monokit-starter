import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { OrderNotFoundError } from "../../domain/shop.errors.js";
import {
  ORDER_REPOSITORY,
  type OrderRepository,
} from "../../domain/shop.repository.js";
import { CancelMyOrderCommand } from "./cancel-my-order.command.js";

@CommandHandler(CancelMyOrderCommand)
export class CancelMyOrderHandler
  implements ICommandHandler<CancelMyOrderCommand>
{
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  async execute({ userId, orderId }: CancelMyOrderCommand): Promise<void> {
    const order = await this.orders.findById(orderId);
    if (!order || order.userId !== userId) {
      throw new OrderNotFoundError();
    }
    order.cancelByCustomer(userId);
    await this.orders.save(order);
  }
}
