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
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { CreateLocaleCommand } from "../application/commands/create-locale.command.js";
import { DeleteLocaleCommand } from "../application/commands/delete-locale.command.js";
import { UpdateLocaleCommand } from "../application/commands/update-locale.command.js";
import { ListLocalesQuery } from "../application/queries/list-locales.query.js";
import type { LocaleView } from "../application/queries/locale.view.js";
import {
  type CreateLocaleDto,
  createLocaleSchema,
  localeViewSchema,
  type UpdateLocaleDto,
  updateLocaleSchema,
} from "./geo.dto.js";
import { getLocale } from "./geo.lookup.js";

// Staff manage the site's locales; exactly one is the default
@ApiTags("geo")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@ApiFailResponse(403, "Not an editor or admin")
@RequirePermission("geo:manage")
@Controller("locales")
export class LocalesController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: "All locales, inactive included; default first",
  })
  @ApiZodResponse(localeViewSchema.array())
  list(): Promise<LocaleView[]> {
    return this.queries.execute(new ListLocalesQuery(false));
  }

  @Post()
  @ApiOperation({
    summary: "Add a locale",
  })
  @ApiZodBody(createLocaleSchema)
  @ApiZodResponse(localeViewSchema, {
    status: 201,
  })
  @ApiFailResponse(409, "Already listed")
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createLocaleSchema)) body: CreateLocaleDto,
  ): Promise<LocaleView> {
    const id = await this.commands.execute(new CreateLocaleCommand(body, user));
    return getLocale(this.queries, id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Rename, (de)activate, make default or reorder; the code is fixed",
  })
  @ApiZodBody(updateLocaleSchema)
  @ApiZodResponse(localeViewSchema)
  @ApiFailResponse(409, "refused for the default locale")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(updateLocaleSchema)) body: UpdateLocaleDto,
  ): Promise<LocaleView> {
    await this.commands.execute(new UpdateLocaleCommand(id, body, user));
    return getLocale(this.queries, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete (refused for the default locale)",
  })
  @ApiNoContentResponse()
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<void> {
    await this.commands.execute(new DeleteLocaleCommand(id, user));
  }
}
