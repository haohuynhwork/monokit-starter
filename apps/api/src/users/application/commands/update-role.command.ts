import { Command } from "@nestjs/cqrs";
import { type Actor, SYSTEM_ACTOR } from "../../../common/domain/actor.js";

export class UpdateRoleCommand extends Command<void> {
  constructor(
    readonly roleId: bigint,
    readonly changes: {
      name?: string;
      description?: string | null;
      permissions?: string[];
    },
    readonly actor: Actor = SYSTEM_ACTOR,
  ) {
    super();
  }
}
