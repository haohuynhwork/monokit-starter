import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { Role } from "../../domain/role.js";
import {
  ROLE_REPOSITORY,
  type RoleRepository,
} from "../../domain/role.repository.js";
import { CreateRoleCommand } from "./create-role.command.js";

@CommandHandler(CreateRoleCommand)
export class CreateRoleHandler implements ICommandHandler<CreateRoleCommand> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
  ) {}

  async execute(command: CreateRoleCommand): Promise<bigint> {
    const role = Role.create(command);
    await this.roles.save(role, (saved) => ({
      actor: command.actor,
      action: "users.role_created",
      entity: {
        type: "role",
        id: String(saved.id),
      },
      data: {
        key: saved.key,
      },
    }));
    return role.id!;
  }
}
