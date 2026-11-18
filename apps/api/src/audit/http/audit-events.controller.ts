import { Controller, Get, Query } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermission } from "../../common/http/guards/auth.decorators.js";
import {
  ApiFailResponse,
  ApiZodQuery,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import {
  type AuditEventPage,
  decodeCursor,
} from "../application/queries/audit-event.view.js";
import { GetAuditEventsQuery } from "../application/queries/get-audit-events.query.js";
import { InvalidAuditCursorError } from "../domain/audit.errors.js";
import {
  auditEventPageSchema,
  type ListAuditEventsDto,
  listAuditEventsSchema,
} from "./audit-events.dto.js";

@ApiTags("audit")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@ApiFailResponse(403, "Admins only")
@Controller("audit-events")
export class AuditEventsController {
  constructor(private readonly queries: QueryBus) {}

  @Get()
  @RequirePermission("audit:read")
  @ApiOperation({
    summary: "Who did what, newest first (admin)",
  })
  @ApiZodQuery(listAuditEventsSchema)
  @ApiZodResponse(auditEventPageSchema)
  @ApiFailResponse(400, "Invalid filter or cursor")
  list(
    @Query(new ZodValidationPipe(listAuditEventsSchema))
    query: ListAuditEventsDto,
  ): Promise<AuditEventPage> {
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    if (query.cursor && !cursor) {
      throw new InvalidAuditCursorError();
    }
    return this.queries.execute(
      new GetAuditEventsQuery(
        {
          entityType: query.entityType,
          entityId: query.entityId,
          actorId: query.actorId ? BigInt(query.actorId) : undefined,
          action: query.action,
          from: query.from,
          to: query.to,
        },
        query.limit,
        cursor,
      ),
    );
  }
}
