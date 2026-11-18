import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { type Actor, metaOf } from "../../common/domain/actor.js";
import {
  type AuthUser,
  CurrentActor,
  CurrentUser,
  Public,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import {
  ApiFailResponse,
  ApiZodBody,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { ResetConfigCommand } from "../application/commands/reset-config.command.js";
import { SetConfigCommand } from "../application/commands/set-config.command.js";
import { GetPublicConfigsQuery } from "../application/queries/get-public-configs.query.js";
import {
  type ConfigView,
  ListConfigsQuery,
} from "../application/queries/list-configs.query.js";
import {
  configListSchema,
  publicConfigsSchema,
  type SetConfigDto,
  setConfigSchema,
} from "./configs.dto.js";

@ApiTags("configs")
@Controller("configs")
export class ConfigsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  // Before ':key'-style routes; anyone, for the site and checkout
  @Public()
  @Get("public")
  @ApiOperation({
    summary: "Public settings, defaults filled in",
  })
  @ApiZodResponse(publicConfigsSchema)
  publicConfigs(): Promise<Record<string, unknown>> {
    return this.queries.execute(new GetPublicConfigsQuery());
  }

  @Get()
  @RequirePermission("settings:manage")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Every setting with its default",
  })
  @ApiZodResponse(configListSchema)
  @ApiFailResponse(403, "Not an admin")
  list(): Promise<ConfigView[]> {
    return this.queries.execute(new ListConfigsQuery());
  }

  @Put(":key")
  @RequirePermission("settings:manage")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Set a setting",
  })
  @ApiZodBody(setConfigSchema)
  @ApiNoContentResponse()
  @ApiFailResponse(400, "Invalid value")
  @ApiFailResponse(404, "Unknown key")
  async set(
    @CurrentUser() user: AuthUser,
    @CurrentActor() actor: Actor,
    @Param("key") key: string,
    @Body(new ZodValidationPipe(setConfigSchema)) body: SetConfigDto,
  ): Promise<void> {
    await this.commands.execute(
      new SetConfigCommand(key, body.value, user.id, metaOf(actor)),
    );
  }

  @Delete(":key")
  @RequirePermission("settings:manage")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Reset a setting to its default",
  })
  @ApiNoContentResponse()
  @ApiFailResponse(404, "Unknown key")
  async reset(@Param("key") key: string): Promise<void> {
    await this.commands.execute(new ResetConfigCommand(key));
  }
}
