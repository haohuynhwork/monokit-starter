import { Inject, Logger } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { toAuditRow } from "../../domain/audit-event.js";
import {
  AUDIT_EVENT_REPOSITORY,
  type AuditEventRepository,
} from "../../domain/audit-event.repository.js";
import { RecordAuditEventCommand } from "./record-audit-event.command.js";

@CommandHandler(RecordAuditEventCommand)
export class RecordAuditEventHandler
  implements ICommandHandler<RecordAuditEventCommand>
{
  private readonly logger = new Logger(RecordAuditEventHandler.name);

  constructor(
    @Inject(AUDIT_EVENT_REPOSITORY)
    private readonly events: AuditEventRepository,
  ) {}

  async execute({ entry }: RecordAuditEventCommand): Promise<void> {
    // A broken audit insert must never fail the user's action
    try {
      await this.events.insert(toAuditRow(entry));
    } catch (error) {
      this.logger.error(`Could not record audit event ${entry.action}`, error);
    }
  }
}
