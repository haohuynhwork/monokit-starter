import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  ROLE_REPOSITORY,
  type RoleRepository,
} from "../../domain/role.repository.js";
import { RoleNotFoundError } from "../../domain/user.errors.js";
import { DeleteRoleCommand } from "./delete-role.command.js";

@CommandHandler(DeleteRoleCommand)
export class DeleteRoleHandler implements ICommandHandler<DeleteRoleCommand> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
  ) {}

  async execute({ roleId, actor }: DeleteRoleCommand): Promise<void> {
    const role = await this.roles.findById(roleId);
    if (!role) {
      throw new RoleNotFoundError();
    }
    role.delete(await this.roles.countUsers(roleId), new Date().toISOString());
    await this.roles.save(role, () => ({
      actor,
      action: "users.role_deleted",
      entity: {
        type: "role",
        id: String(roleId),
      },
      data: {
        key: role.key,
      },
    }));
  }
}
