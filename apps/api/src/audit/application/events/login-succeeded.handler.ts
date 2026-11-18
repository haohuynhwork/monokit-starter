import { CommandBus, EventsHandler, type IEventHandler } from "@nestjs/cqrs";
import { LoginSucceededEvent } from "../../../auth/domain/events/login-succeeded.event.js";
import type { AuditEntry } from "../../../common/domain/audit-entry.js";
import { RecordAuditEventCommand } from "../commands/record-audit-event.command.js";

export function loginSucceededEntry(event: LoginSucceededEvent): AuditEntry {
  return {
    actor: {
      userId: event.userId,
      ...event.meta,
    },
    action: "auth.login",
    entity: {
      type: "user",
      id: String(event.userId),
    },
    data: {
      provider: event.provider,
    },
  };
}

// After the commit; best effort (RecordAuditEventCommand swallows failures)
@EventsHandler(LoginSucceededEvent)
export class LoginSucceededAuditor
  implements IEventHandler<LoginSucceededEvent>
{
  constructor(private readonly commands: CommandBus) {}

  handle(event: LoginSucceededEvent): Promise<void> {
    return this.commands.execute(
      new RecordAuditEventCommand(loginSucceededEntry(event)),
    );
  }
}
