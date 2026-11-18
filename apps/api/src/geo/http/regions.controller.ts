import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  type AuthUser,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import {
  ApiFailResponse,
  ApiZodBody,
  ApiZodQuery,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { CreateRegionCommand } from "../application/commands/create-region.command.js";
import { DeleteRegionCommand } from "../application/commands/delete-region.command.js";
import { UpdateRegionCommand } from "../application/commands/update-region.command.js";
import type { RegionView } from "../application/queries/region.view.js";
import {
  type CreateRegionDto,
  createRegionSchema,
  type ListRegionsDto,
  listRegionsSchema,
  regionViewSchema,
  type UpdateRegionDto,
  updateRegionSchema,
} from "./geo.dto.js";
import { getRegion, listRegionsQuery } from "./geo.lookup.js";

// Staff manage the address pick list; customers read GET /public/regions
@ApiTags("geo")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@ApiFailResponse(403, "Not an editor or admin")
@RequirePermission("geo:manage")
@Controller("regions")
export class RegionsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: "A country's regions, inactive included",
  })
  @ApiZodQuery(listRegionsSchema)
  @ApiZodResponse(regionViewSchema.array())
  list(
    @Query(new ZodValidationPipe(listRegionsSchema)) query: ListRegionsDto,
  ): Promise<RegionView[]> {
    return this.queries.execute(listRegionsQuery(query, false));
  }

  @Post()
  @ApiOperation({
    summary: "Add a region",
  })
  @ApiZodBody(createRegionSchema)
  @ApiZodResponse(regionViewSchema, {
    status: 201,
  })
  @ApiFailResponse(409, "Code taken")
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createRegionSchema)) body: CreateRegionDto,
  ): Promise<RegionView> {
    const id = await this.commands.execute(new CreateRegionCommand(body, user));
    return getRegion(this.queries, id);
  }

  @Patch(":id")
  @ApiOperation({
    summary:
      "Rename, reorder, move or (de)activate a region; the code is fixed",
  })
  @ApiZodBody(updateRegionSchema)
  @ApiZodResponse(regionViewSchema)
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(updateRegionSchema)) body: UpdateRegionDto,
  ): Promise<RegionView> {
    await this.commands.execute(new UpdateRegionCommand(id, body, user));
    return getRegion(this.queries, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete (refused while addresses or subregions use it)",
  })
  @ApiNoContentResponse()
  @ApiFailResponse(409, "In use; deactivate it instead")
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<void> {
    await this.commands.execute(new DeleteRegionCommand(id, user));
  }
}
