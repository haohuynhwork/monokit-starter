import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Args, ID, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { Actor } from "../../common/domain/actor.js";
import { PaginatedType, page } from "../../common/graphql/paginated.js";
import {
  type AuthUser,
  CurrentActor,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import { Paginated } from "../../common/http/responses/paginated.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { ChangePasswordCommand } from "../application/commands/change-password.command.js";
import { ChangeUserRoleCommand } from "../application/commands/change-user-role.command.js";
import { ChangeUserStatusCommand } from "../application/commands/change-user-status.command.js";
import { CreateUserCommand } from "../application/commands/create-user.command.js";
import { DeleteUserCommand } from "../application/commands/delete-user.command.js";
import { RemoveAvatarCommand } from "../application/commands/remove-avatar.command.js";
import { UpdateProfileCommand } from "../application/commands/update-profile.command.js";
import { GetUserQuery } from "../application/queries/get-user.query.js";
import {
  ListPermissionsQuery,
  type PermissionsView,
} from "../application/queries/list-permissions.query.js";
import { ListUsersQuery } from "../application/queries/list-users.query.js";
import type { UserView } from "../application/queries/user.view.js";
import { UserNotFoundError } from "../domain/user.errors.js";
import type { UserRole, UserStatus } from "../domain/user.js";
import {
  type ChangePasswordDto,
  type CreateUserDto,
  changePasswordSchema,
  changeRoleSchema,
  changeStatusSchema,
  createUserSchema,
  listUsersSchema,
  type UpdateProfileDto,
  updateProfileSchema,
} from "../http/users.dto.js";
import {
  ChangePasswordInput,
  CreateUserInput,
  UpdateProfileInput,
  UserModel,
  UserPermissionsModel,
  UserRoleEnum,
  UserStatusEnum,
} from "./user.model.js";

export const UserPage = PaginatedType(UserModel, "UserPage");

const listArgs = new ZodValidationPipe(listUsersSchema);
const roleArgs = new ZodValidationPipe(changeRoleSchema);
const statusArgs = new ZodValidationPipe(changeStatusSchema);
const idArg = {
  type: () => ID,
} as const;

// Same as UsersController (avatar upload stays on REST: multipart)
@Resolver(() => UserModel)
export class UsersResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  // --- Signed-in user ---

  @Query(() => UserModel, {
    description: "Current user",
  })
  me(@CurrentUser() user: AuthUser): Promise<UserView> {
    return this.get(user.id);
  }

  @Mutation(() => UserModel, {
    description: "Update own profile",
  })
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Args(
      "input",
      {
        type: () => UpdateProfileInput,
      },
      new ZodValidationPipe(updateProfileSchema),
    )
    input: UpdateProfileDto,
  ): Promise<UserView> {
    await this.commands.execute(new UpdateProfileCommand(user.id, input));
    return this.get(user.id);
  }

  @Mutation(() => Boolean, {
    description: "Change own password",
  })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Args(
      "input",
      {
        type: () => ChangePasswordInput,
      },
      new ZodValidationPipe(changePasswordSchema),
    )
    input: ChangePasswordDto,
  ): Promise<boolean> {
    await this.commands.execute(
      new ChangePasswordCommand(
        user.id,
        input.currentPassword,
        input.newPassword,
        input.notify,
      ),
    );
    return true;
  }

  @Mutation(() => UserModel, {
    description: "Remove own avatar",
  })
  async removeAvatar(@CurrentUser() user: AuthUser): Promise<UserView> {
    await this.commands.execute(new RemoveAvatarCommand(user.id));
    return this.get(user.id);
  }

  @Query(() => UserPermissionsModel, {
    description: "What each role may do",
  })
  permissions(): Promise<PermissionsView> {
    return this.queries.execute(new ListPermissionsQuery());
  }

  // --- Admin ---

  @Query(() => UserPage, {
    description: "List users (admin)",
  })
  @RequirePermission("user:manage")
  async users(
    @Args("role", {
      type: () => UserRoleEnum,
      nullable: true,
    })
    role?: UserRole,
    @Args("status", {
      type: () => UserStatusEnum,
      nullable: true,
    })
    status?: UserStatus,
    @Args("q", {
      type: () => String,
      nullable: true,
    })
    q?: string,
    @Args("limit", {
      type: () => Int,
      nullable: true,
    })
    limit?: number,
    @Args("offset", {
      type: () => Int,
      nullable: true,
    })
    offset?: number,
  ) {
    const {
      limit: l,
      offset: o,
      ...filter
    } = listArgs.transform({
      role: role ?? undefined,
      status: status ?? undefined,
      q: q ?? undefined,
      limit: limit ?? undefined,
      offset: offset ?? undefined,
    });
    const { items, total } = await this.queries.execute(
      new ListUsersQuery(filter, l, o),
    );
    return page(
      new Paginated(items, {
        total,
        limit: l,
        offset: o,
      }),
    );
  }

  @Mutation(() => UserModel, {
    description: "Create a user (admin)",
  })
  @RequirePermission("user:manage")
  async createUser(
    @Args(
      "input",
      {
        type: () => CreateUserInput,
      },
      new ZodValidationPipe(createUserSchema),
    )
    input: CreateUserDto,
  ): Promise<UserView> {
    const { email, password, role, ...profile } = input;
    const id = await this.commands.execute(
      new CreateUserCommand(email, password, profile, role),
    );
    return this.get(id);
  }

  @Query(() => UserModel, {
    description: "Get a user (admin)",
  })
  @RequirePermission("user:manage")
  user(@Args("id", idArg, IdPipe) id: bigint): Promise<UserView> {
    return this.get(id);
  }

  @Mutation(() => UserModel, {
    description: "Update a user's profile (admin)",
  })
  @RequirePermission("user:manage")
  async updateUser(
    @Args("id", idArg, IdPipe) id: bigint,
    @Args(
      "input",
      {
        type: () => UpdateProfileInput,
      },
      new ZodValidationPipe(updateProfileSchema),
    )
    input: UpdateProfileDto,
  ): Promise<UserView> {
    await this.commands.execute(new UpdateProfileCommand(id, input));
    return this.get(id);
  }

  @Mutation(() => UserModel, {
    description: "Change a user's role (admin)",
  })
  @RequirePermission("user:manage")
  async changeUserRole(
    @CurrentActor() actor: Actor,
    @Args("id", idArg, IdPipe) id: bigint,
    @Args("role", {
      type: () => UserRoleEnum,
    })
    role: UserRole,
  ): Promise<UserView> {
    const body = roleArgs.transform({
      role,
    });
    await this.commands.execute(
      new ChangeUserRoleCommand(id, body.role, actor),
    );
    return this.get(id);
  }

  @Mutation(() => UserModel, {
    description: "Enable or disable a user (admin)",
  })
  @RequirePermission("user:manage")
  async changeUserStatus(
    @Args("id", idArg, IdPipe) id: bigint,
    @Args("status", {
      type: () => UserStatusEnum,
    })
    status: UserStatus,
  ): Promise<UserView> {
    const body = statusArgs.transform({
      status,
    });
    await this.commands.execute(new ChangeUserStatusCommand(id, body.status));
    return this.get(id);
  }

  @Mutation(() => Boolean, {
    description: "Soft-delete a user (admin)",
  })
  @RequirePermission("user:manage")
  async deleteUser(
    @CurrentActor() actor: Actor,
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<boolean> {
    await this.commands.execute(new DeleteUserCommand(id, actor));
    return true;
  }

  private async get(id: bigint): Promise<UserView> {
    const user = await this.queries.execute(new GetUserQuery(id));
    if (!user) {
      throw new UserNotFoundError();
    }
    return user;
  }
}
