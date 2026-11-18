import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  AUDIT_EVENT_REPOSITORY,
  type AuditEventRepository,
} from "../../domain/audit-event.repository.js";
import { PurgeAuditEventsCommand } from "./purge-audit-events.command.js";

const DAY_MS = 24 * 60 * 60 * 1000;

@CommandHandler(PurgeAuditEventsCommand)
export class PurgeAuditEventsHandler
  implements ICommandHandler<PurgeAuditEventsCommand>
{
  constructor(
    @Inject(AUDIT_EVENT_REPOSITORY)
    private readonly events: AuditEventRepository,
  ) {}

  async execute({ days }: PurgeAuditEventsCommand): Promise<void> {
    await this.events.deleteOlderThan(new Date(Date.now() - days * DAY_MS));
  }
}
