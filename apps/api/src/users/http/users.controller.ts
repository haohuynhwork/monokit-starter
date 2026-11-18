import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { Actor } from "../../common/domain/actor.js";
import {
  type AuthUser,
  CurrentActor,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import {
  ApiFailResponse,
  ApiZodBody,
  ApiZodPaginatedResponse,
  ApiZodQuery,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { Paginated } from "../../common/http/responses/paginated.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { ChangePasswordCommand } from "../application/commands/change-password.command.js";
import { ChangeUserRoleCommand } from "../application/commands/change-user-role.command.js";
import { ChangeUserStatusCommand } from "../application/commands/change-user-status.command.js";
import { CreateUserCommand } from "../application/commands/create-user.command.js";
import { DeleteUserCommand } from "../application/commands/delete-user.command.js";
import { RemoveAvatarCommand } from "../application/commands/remove-avatar.command.js";
import { SetAvatarCommand } from "../application/commands/set-avatar.command.js";
import { UpdateProfileCommand } from "../application/commands/update-profile.command.js";
import { GetUserQuery } from "../application/queries/get-user.query.js";
import {
  ListPermissionsQuery,
  type PermissionsView,
} from "../application/queries/list-permissions.query.js";
import { ListUsersQuery } from "../application/queries/list-users.query.js";
import type { UserView } from "../application/queries/user.view.js";
import { UserNotFoundError } from "../domain/user.errors.js";
import {
  type ChangePasswordDto,
  type ChangeRoleDto,
  type ChangeStatusDto,
  type CreateUserDto,
  changePasswordSchema,
  changeRoleSchema,
  changeStatusSchema,
  createUserSchema,
  type ListUsersDto,
  listUsersSchema,
  permissionsViewSchema,
  type UpdateProfileDto,
  updateProfileSchema,
  userViewSchema,
} from "./users.dto.js";

// Multer's file, the fields used here
interface UploadedImage {
  buffer: Buffer;
  originalname: string;
}

// A little above the 2 MB avatar policy, so storage reports the real error
const AVATAR_UPLOAD_LIMIT = 2 * 1024 * 1024 + 1;

@ApiTags("users")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@Controller("users")
export class UsersController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  // --- Signed-in user ---

  @Get("me")
  @ApiOperation({
    summary: "Current user",
  })
  @ApiZodResponse(userViewSchema)
  me(@CurrentUser() user: AuthUser): Promise<UserView> {
    return this.get(user.id);
  }

  @Patch("me")
  @ApiOperation({
    summary: "Update own profile",
  })
  @ApiZodBody(updateProfileSchema)
  @ApiZodResponse(userViewSchema)
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileDto,
  ): Promise<UserView> {
    await this.commands.execute(new UpdateProfileCommand(user.id, body));
    return this.get(user.id);
  }

  @Put("me/password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Change own password",
  })
  @ApiZodBody(changePasswordSchema)
  @ApiNoContentResponse()
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordDto,
  ): Promise<void> {
    await this.commands.execute(
      new ChangePasswordCommand(
        user.id,
        body.currentPassword,
        body.newPassword,
        body.notify,
      ),
    );
  }

  @Put("me/avatar")
  @ApiOperation({
    summary: "Upload own avatar (png, jpeg or webp, max 2 MB)",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
      required: [
        "file",
      ],
    },
  })
  @ApiZodResponse(userViewSchema)
  @UseInterceptors(
    // In memory: avatars are small, and storage hashes and sniffs the bytes.
    // The limit stops big bodies early; storage enforces the real policy.
    FileInterceptor("file", {
      limits: {
        fileSize: AVATAR_UPLOAD_LIMIT,
      },
    }),
  )
  async setAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedImage | undefined,
  ): Promise<UserView> {
    if (!file) {
      throw new BadRequestException("Missing file");
    }
    await this.commands.execute(
      new SetAvatarCommand(user.id, file.buffer, file.originalname),
    );
    return this.get(user.id);
  }

  @Delete("me/avatar")
  @ApiOperation({
    summary: "Remove own avatar",
  })
  @ApiZodResponse(userViewSchema)
  async removeAvatar(@CurrentUser() user: AuthUser): Promise<UserView> {
    await this.commands.execute(new RemoveAvatarCommand(user.id));
    return this.get(user.id);
  }

  // Any signed-in user: what each role may do. Before ':id'.
  @Get("permissions")
  @ApiOperation({
    summary: "What each role may do",
  })
  @ApiZodResponse(permissionsViewSchema)
  permissions(): Promise<PermissionsView> {
    return this.queries.execute(new ListPermissionsQuery());
  }

  // --- Admin ---

  @Get()
  @RequirePermission("user:manage")
  @ApiOperation({
    summary: "List users (admin)",
  })
  @ApiZodQuery(listUsersSchema)
  @ApiZodPaginatedResponse(userViewSchema)
  async list(
    @Query(new ZodValidationPipe(listUsersSchema)) query: ListUsersDto,
  ): Promise<Paginated<UserView>> {
    const { limit, offset, ...filter } = query;
    const { items, total } = await this.queries.execute(
      new ListUsersQuery(filter, limit, offset),
    );
    return new Paginated(items, {
      total,
      limit,
      offset,
    });
  }

  @Post()
  @RequirePermission("user:manage")
  @ApiOperation({
    summary: "Create a user (admin)",
  })
  @ApiZodBody(createUserSchema)
  @ApiZodResponse(userViewSchema, {
    status: 201,
  })
  async create(
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserDto,
  ): Promise<UserView> {
    const { email, password, role, ...profile } = body;
    const id = await this.commands.execute(
      new CreateUserCommand(email, password, profile, role),
    );
    return this.get(id);
  }

  @Get(":id")
  @RequirePermission("user:manage")
  @ApiOperation({
    summary: "Get a user (admin)",
  })
  @ApiZodResponse(userViewSchema)
  show(@Param("id", IdPipe) id: bigint): Promise<UserView> {
    return this.get(id);
  }

  @Patch(":id")
  @RequirePermission("user:manage")
  @ApiOperation({
    summary: "Update a user's profile (admin)",
  })
  @ApiZodBody(updateProfileSchema)
  @ApiZodResponse(userViewSchema)
  async update(
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileDto,
  ): Promise<UserView> {
    await this.commands.execute(new UpdateProfileCommand(id, body));
    return this.get(id);
  }

  @Put(":id/role")
  @RequirePermission("user:manage")
  @ApiOperation({
    summary: "Change a user's role (admin)",
  })
  @ApiZodBody(changeRoleSchema)
  @ApiZodResponse(userViewSchema)
  async changeRole(
    @CurrentActor() actor: Actor,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(changeRoleSchema)) body: ChangeRoleDto,
  ): Promise<UserView> {
    await this.commands.execute(
      new ChangeUserRoleCommand(id, body.role, actor),
    );
    return this.get(id);
  }

  @Put(":id/status")
  @RequirePermission("user:manage")
  @ApiOperation({
    summary: "Enable or disable a user (admin)",
  })
  @ApiZodBody(changeStatusSchema)
  @ApiZodResponse(userViewSchema)
  async changeStatus(
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(changeStatusSchema)) body: ChangeStatusDto,
  ): Promise<UserView> {
    await this.commands.execute(new ChangeUserStatusCommand(id, body.status));
    return this.get(id);
  }

  @Delete(":id")
  @RequirePermission("user:manage")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Soft-delete a user (admin)",
  })
  @ApiNoContentResponse()
  async remove(
    @CurrentActor() actor: Actor,
    @Param("id", IdPipe) id: bigint,
  ): Promise<void> {
    await this.commands.execute(new DeleteUserCommand(id, actor));
  }

  private async get(id: bigint): Promise<UserView> {
    const user = await this.queries.execute(new GetUserQuery(id));
    if (!user) {
      throw new UserNotFoundError();
    }
    return user;
  }
}
