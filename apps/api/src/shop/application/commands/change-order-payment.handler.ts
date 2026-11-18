import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { OrderNotFoundError } from "../../domain/shop.errors.js";
import { checkStaff } from "../../domain/shop.js";
import {
  ORDER_REPOSITORY,
  type OrderRepository,
} from "../../domain/shop.repository.js";
import { ChangeOrderPaymentCommand } from "./change-order-payment.command.js";

@CommandHandler(ChangeOrderPaymentCommand)
export class ChangeOrderPaymentHandler
  implements ICommandHandler<ChangeOrderPaymentCommand>
{
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  async execute({
    orderId,
    paymentStatus,
    actor,
  }: ChangeOrderPaymentCommand): Promise<void> {
    checkStaff(actor);
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new OrderNotFoundError();
    }
    order.changePayment(paymentStatus, actor.id, new Date());
    await this.orders.save(order);
  }
}
