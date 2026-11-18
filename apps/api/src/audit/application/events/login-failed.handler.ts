import { CommandBus, EventsHandler, type IEventHandler } from "@nestjs/cqrs";
import { LoginFailedEvent } from "../../../auth/domain/events/login-failed.event.js";
import type { AuditEntry } from "../../../common/domain/audit-entry.js";
import { RecordAuditEventCommand } from "../commands/record-audit-event.command.js";

export function loginFailedEntry(event: LoginFailedEvent): AuditEntry {
  // Anonymous and without a target: no email is stored (Privacy)
  return {
    actor: {
      userId: null,
      ...event.meta,
    },
    action: "auth.login_failed",
    entity: null,
    data: {
      reason: event.reason,
    },
  };
}

// After the commit; best effort (RecordAuditEventCommand swallows failures)
@EventsHandler(LoginFailedEvent)
export class LoginFailedAuditor implements IEventHandler<LoginFailedEvent> {
  constructor(private readonly commands: CommandBus) {}

  handle(event: LoginFailedEvent): Promise<void> {
    return this.commands.execute(
      new RecordAuditEventCommand(loginFailedEntry(event)),
    );
  }
}
