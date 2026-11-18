import { Command } from "@nestjs/cqrs";
import { type Actor, SYSTEM_ACTOR } from "../../../common/domain/actor.js";

export class DeleteRoleCommand extends Command<void> {
  constructor(
    readonly roleId: bigint,
    readonly actor: Actor = SYSTEM_ACTOR,
  ) {
    super();
  }
}
