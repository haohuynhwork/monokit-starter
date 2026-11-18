import { Controller, Get, Query } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/http/guards/auth.decorators.js";
import { ApiZodQuery, ApiZodResponse } from "../../common/http/setup/openapi.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import type { RegionView } from "../application/queries/region.view.js";
import {
  type ListRegionsDto,
  listRegionsSchema,
  regionViewSchema,
} from "./geo.dto.js";
import { listRegionsQuery } from "./geo.lookup.js";

// The address picker: active regions only, no sign-in
@ApiTags("public")
@Public()
@Controller("public/regions")
export class PublicRegionsController {
  constructor(private readonly queries: QueryBus) {}

  @Get()
  @ApiOperation({
    summary: "A country's active regions",
  })
  @ApiZodQuery(listRegionsSchema)
  @ApiZodResponse(regionViewSchema.array())
  list(
    @Query(new ZodValidationPipe(listRegionsSchema)) query: ListRegionsDto,
  ): Promise<RegionView[]> {
    return this.queries.execute(listRegionsQuery(query, true));
  }
}
