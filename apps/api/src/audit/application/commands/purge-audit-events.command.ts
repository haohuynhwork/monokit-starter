import { Command } from "@nestjs/cqrs";

// Retention: deletes rows older than `days`
export class PurgeAuditEventsCommand extends Command<void> {
  constructor(readonly days: number) {
    super();
  }
}
