import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { OrderNotFoundError } from "../../domain/shop.errors.js";
import { checkStaff } from "../../domain/shop.js";
import {
  ORDER_REPOSITORY,
  type OrderRepository,
} from "../../domain/shop.repository.js";
import { ChangeOrderStatusCommand } from "./change-order-status.command.js";

@CommandHandler(ChangeOrderStatusCommand)
export class ChangeOrderStatusHandler
  implements ICommandHandler<ChangeOrderStatusCommand>
{
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  async execute({
    orderId,
    status,
    trackingNumber,
    actor,
  }: ChangeOrderStatusCommand): Promise<void> {
    checkStaff(actor);
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new OrderNotFoundError();
    }
    order.changeStatus(status, actor.id, trackingNumber);
    await this.orders.save(order);
  }
}
