import { CommandBus, EventsHandler, type IEventHandler } from "@nestjs/cqrs";
import type { AuditEntry } from "../../../common/domain/audit-entry.js";
import { OrderPlacedEvent } from "../../../shop/domain/events/order-placed.event.js";
import { RecordAuditEventCommand } from "../commands/record-audit-event.command.js";

export function orderPlacedEntry(event: OrderPlacedEvent): AuditEntry {
  return {
    actor: {
      userId: event.userId,
      ...event.meta,
    },
    action: "orders.placed",
    entity: {
      type: "order",
      id: String(event.orderId),
    },
    // Minor units as text: JSON has no bigint
    data: {
      total: String(event.total),
      currency: event.currency,
    },
  };
}

// After the commit; best effort (RecordAuditEventCommand swallows failures)
@EventsHandler(OrderPlacedEvent)
export class OrderPlacedAuditor implements IEventHandler<OrderPlacedEvent> {
  constructor(private readonly commands: CommandBus) {}

  handle(event: OrderPlacedEvent): Promise<void> {
    return this.commands.execute(
      new RecordAuditEventCommand(orderPlacedEntry(event)),
    );
  }
}
