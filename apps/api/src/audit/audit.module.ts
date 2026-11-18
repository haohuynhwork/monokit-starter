import { Global, Module } from "@nestjs/common";
import { AUDIT_WRITER } from "../common/infrastructure/audit-writer.js";
import { PurgeAuditEventsHandler } from "./application/commands/purge-audit-events.handler.js";
import { RecordAuditEventHandler } from "./application/commands/record-audit-event.handler.js";
import { ConfigUpdatedAuditor } from "./application/events/config-updated.handler.js";
import { LoginFailedAuditor } from "./application/events/login-failed.handler.js";
import { LoginSucceededAuditor } from "./application/events/login-succeeded.handler.js";
import { OrderPlacedAuditor } from "./application/events/order-placed.handler.js";
import { PostPublishedAuditor } from "./application/events/post-published.handler.js";
import { GetAuditEventsHandler } from "./application/queries/get-audit-events.handler.js";
import { AUDIT_EVENT_REPOSITORY } from "./domain/audit-event.repository.js";
import { AuditEventsController } from "./http/audit-events.controller.js";
import { AuditRetentionJob } from "./infrastructure/audit-retention.job.js";
import { PrismaAuditEventRepository } from "./infrastructure/prisma-audit-event.repository.js";

// Global so any context's repository can inject AUDIT_WRITER (the port in
// common/) for guaranteed rows without importing this module
@Global()
@Module({
  controllers: [
    AuditEventsController,
  ],
  providers: [
    PrismaAuditEventRepository,
    {
      provide: AUDIT_EVENT_REPOSITORY,
      useExisting: PrismaAuditEventRepository,
    },
    {
      provide: AUDIT_WRITER,
      useExisting: PrismaAuditEventRepository,
    },
    RecordAuditEventHandler,
    PurgeAuditEventsHandler,
    PostPublishedAuditor,
    OrderPlacedAuditor,
    ConfigUpdatedAuditor,
    LoginSucceededAuditor,
    LoginFailedAuditor,
    GetAuditEventsHandler,
    AuditRetentionJob,
  ],
  exports: [
    AUDIT_WRITER,
  ],
})
export class AuditModule {}
