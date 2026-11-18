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
import type { Actor } from "../../common/domain/actor.js";
import {
  CurrentActor,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import {
  ApiFailResponse,
  ApiZodBody,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { CreateRoleCommand } from "../application/commands/create-role.command.js";
import { DeleteRoleCommand } from "../application/commands/delete-role.command.js";
import { UpdateRoleCommand } from "../application/commands/update-role.command.js";
import {
  ListRolesQuery,
  type RoleView,
} from "../application/queries/list-roles.query.js";
import { RoleNotFoundError } from "../domain/user.errors.js";
import {
  type CreateRoleDto,
  createRoleSchema,
  roleViewSchema,
  type UpdateRoleDto,
  updateRoleSchema,
} from "./roles.dto.js";

@ApiTags("users")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@RequirePermission("user:manage")
@Controller("roles")
export class RolesController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List roles with their permissions and user counts",
  })
  @ApiZodResponse(roleViewSchema.array())
  list(): Promise<RoleView[]> {
    return this.queries.execute(new ListRolesQuery());
  }

  @Post()
  @ApiOperation({
    summary: "Create a custom role",
  })
  @ApiZodBody(createRoleSchema)
  @ApiZodResponse(roleViewSchema, {
    status: 201,
  })
  async create(
    @CurrentActor() actor: Actor,
    @Body(new ZodValidationPipe(createRoleSchema)) body: CreateRoleDto,
  ): Promise<RoleView> {
    const id = await this.commands.execute(
      new CreateRoleCommand(
        body.key,
        body.name,
        body.description,
        body.permissions,
        actor,
      ),
    );
    return this.get(id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Rename a custom role or change its permissions",
  })
  @ApiZodBody(updateRoleSchema)
  @ApiZodResponse(roleViewSchema)
  async update(
    @CurrentActor() actor: Actor,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(updateRoleSchema)) body: UpdateRoleDto,
  ): Promise<RoleView> {
    await this.commands.execute(new UpdateRoleCommand(id, body, actor));
    return this.get(id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a custom role nobody has",
  })
  @ApiNoContentResponse()
  async remove(
    @CurrentActor() actor: Actor,
    @Param("id", IdPipe) id: bigint,
  ): Promise<void> {
    await this.commands.execute(new DeleteRoleCommand(id, actor));
  }

  private async get(id: bigint): Promise<RoleView> {
    const roles = await this.queries.execute(new ListRolesQuery());
    const role = roles.find((r) => r.id === String(id));
    if (!role) {
      throw new RoleNotFoundError();
    }
    return role;
  }
}
