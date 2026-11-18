import { Module } from "@nestjs/common";
import { ChangePasswordHandler } from "./application/commands/change-password.handler.js";
import { ChangeUserRoleHandler } from "./application/commands/change-user-role.handler.js";
import { ChangeUserStatusHandler } from "./application/commands/change-user-status.handler.js";
import { CreateRoleHandler } from "./application/commands/create-role.handler.js";
import { CreateUserHandler } from "./application/commands/create-user.handler.js";
import { DeleteRoleHandler } from "./application/commands/delete-role.handler.js";
import { DeleteUserHandler } from "./application/commands/delete-user.handler.js";
import { RemoveAvatarHandler } from "./application/commands/remove-avatar.handler.js";
import { ResetPasswordHandler } from "./application/commands/reset-password.handler.js";
import { SetAvatarHandler } from "./application/commands/set-avatar.handler.js";
import { UpdateProfileHandler } from "./application/commands/update-profile.handler.js";
import { UpdateRoleHandler } from "./application/commands/update-role.handler.js";
import { FindPasswordResetAccountHandler } from "./application/queries/find-password-reset-account.handler.js";
import { GetRolePermissionsHandler } from "./application/queries/get-role-permissions.handler.js";
import { GetSessionUserHandler } from "./application/queries/get-session-user.handler.js";
import { GetUserHandler } from "./application/queries/get-user.handler.js";
import { ListActiveUserIdsHandler } from "./application/queries/list-active-user-ids.handler.js";
import { ListPermissionsHandler } from "./application/queries/list-permissions.handler.js";
import { ListRolesHandler } from "./application/queries/list-roles.handler.js";
import { ListUsersHandler } from "./application/queries/list-users.handler.js";
import { VerifyCredentialsHandler } from "./application/queries/verify-credentials.handler.js";
import { PASSWORD_HASHER } from "./domain/password.js";
import { PHONE_PARSER } from "./domain/phone.js";
import { ROLE_REPOSITORY } from "./domain/role.repository.js";
import { ROLE_PERMISSIONS_READER } from "./domain/role-permissions.reader.js";
import { USER_REPOSITORY } from "./domain/user.repository.js";
import { UsersResolver } from "./graphql/users.resolver.js";
import { RolesController } from "./http/roles.controller.js";
import { UsersController } from "./http/users.controller.js";
import { Argon2PasswordHasher } from "./infrastructure/argon2-password-hasher.js";
import { CachedRolePermissionsReader } from "./infrastructure/cached-role-permissions.reader.js";
import { GeoPhoneParser } from "./infrastructure/geo-phone-parser.js";
import { PrismaRoleRepository } from "./infrastructure/prisma-role.repository.js";
import { PrismaUserRepository } from "./infrastructure/prisma-user.repository.js";
import { RoleSyncService } from "./infrastructure/role-sync.service.js";

@Module({
  controllers: [
    UsersController,
    RolesController,
  ],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: ROLE_REPOSITORY,
      useClass: PrismaRoleRepository,
    },
    {
      provide: ROLE_PERMISSIONS_READER,
      useClass: CachedRolePermissionsReader,
    },
    RoleSyncService,
    {
      provide: PASSWORD_HASHER,
      useClass: Argon2PasswordHasher,
    },
    {
      provide: PHONE_PARSER,
      useClass: GeoPhoneParser,
    },
    CreateUserHandler,
    UpdateProfileHandler,
    ChangePasswordHandler,
    ResetPasswordHandler,
    ChangeUserRoleHandler,
    CreateRoleHandler,
    UpdateRoleHandler,
    DeleteRoleHandler,
    ChangeUserStatusHandler,
    DeleteUserHandler,
    SetAvatarHandler,
    RemoveAvatarHandler,
    GetUserHandler,
    GetSessionUserHandler,
    ListUsersHandler,
    ListPermissionsHandler,
    ListRolesHandler,
    GetRolePermissionsHandler,
    ListActiveUserIdsHandler,
    VerifyCredentialsHandler,
    FindPasswordResetAccountHandler,
    UsersResolver,
  ],
})
export class UsersModule {}
