import { Logger } from "@nestjs/common";
import { CommandBus, EventsHandler, type IEventHandler } from "@nestjs/cqrs";
import { OrderPlacedEvent } from "../../domain/events/order-placed.event.js";
import { RemoveFromCartCommand } from "../commands/remove-from-cart.command.js";

// What was ordered leaves the cart; the rest stays for later
@EventsHandler(OrderPlacedEvent)
export class ClearOrderedFromCart implements IEventHandler<OrderPlacedEvent> {
  private readonly logger = new Logger(ClearOrderedFromCart.name);

  constructor(private readonly commands: CommandBus) {}

  async handle(event: OrderPlacedEvent): Promise<void> {
    // Outside the request: a failure must not fail the checkout
    try {
      await this.commands.execute(
        new RemoveFromCartCommand(event.userId, event.variantIds),
      );
    } catch (err) {
      this.logger.error(
        `Could not clear order ${event.orderId} from the cart`,
        err,
      );
    }
  }
}
