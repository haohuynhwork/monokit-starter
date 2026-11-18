import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  ROLE_REPOSITORY,
  type RoleRepository,
} from "../../domain/role.repository.js";
import { RoleNotFoundError } from "../../domain/user.errors.js";
import { UpdateRoleCommand } from "./update-role.command.js";

@CommandHandler(UpdateRoleCommand)
export class UpdateRoleHandler implements ICommandHandler<UpdateRoleCommand> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
  ) {}

  async execute({ roleId, changes, actor }: UpdateRoleCommand): Promise<void> {
    const role = await this.roles.findById(roleId);
    if (!role) {
      throw new RoleNotFoundError();
    }
    role.update(changes);
    await this.roles.save(role, () => ({
      actor,
      action: "users.role_updated",
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
