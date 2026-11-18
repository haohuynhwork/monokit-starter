import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { PurgeAuditEventsCommand } from "../application/commands/purge-audit-events.command.js";

const DAY_MS = 24 * 60 * 60 * 1000;
// First run a minute after boot, so startup isn't slowed
const FIRST_RUN_MS = 60_000;

// AUDIT_RETENTION_DAYS, default 365 (ideas/audit/index.md, Retention)
export function retentionDays(env = process.env): number {
  const days = Number(env.AUDIT_RETENTION_DAYS ?? 365);
  return Number.isInteger(days) && days > 0 ? days : 365;
}

// Daily retention cleanup. The api has no scheduler yet, so a plain timer:
// every instance runs it, which is harmless (an idempotent DELETE).
@Injectable()
export class AuditRetentionJob
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(AuditRetentionJob.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly commands: CommandBus) {}

  onApplicationBootstrap(): void {
    this.timer = setTimeout(() => {
      void this.run();
      this.timer = setInterval(() => void this.run(), DAY_MS);
      this.timer.unref();
    }, FIRST_RUN_MS);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    clearTimeout(this.timer);
    clearInterval(this.timer);
  }

  async run(): Promise<void> {
    try {
      await this.commands.execute(new PurgeAuditEventsCommand(retentionDays()));
    } catch (error) {
      this.logger.error("Audit retention cleanup failed", error);
    }
  }
}
