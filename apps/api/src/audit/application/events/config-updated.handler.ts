import { CommandBus, EventsHandler, type IEventHandler } from "@nestjs/cqrs";
import type { AuditEntry } from "../../../common/domain/audit-entry.js";
import { ConfigUpdatedEvent } from "../../../configs/domain/events/config-updated.event.js";
import { RecordAuditEventCommand } from "../commands/record-audit-event.command.js";

export function configUpdatedEntry(event: ConfigUpdatedEvent): AuditEntry {
  // The key only: some values are secrets
  return {
    actor: {
      userId: event.actorId,
      ...event.meta,
    },
    action: "configs.updated",
    entity: {
      type: "config",
      id: event.key,
    },
    data: {
      key: event.key,
    },
  };
}

// After the commit; best effort (RecordAuditEventCommand swallows failures)
@EventsHandler(ConfigUpdatedEvent)
export class ConfigUpdatedAuditor implements IEventHandler<ConfigUpdatedEvent> {
  constructor(private readonly commands: CommandBus) {}

  handle(event: ConfigUpdatedEvent): Promise<void> {
    return this.commands.execute(
      new RecordAuditEventCommand(configUpdatedEntry(event)),
    );
  }
}
