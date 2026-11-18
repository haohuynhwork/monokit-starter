import { Command } from "@nestjs/cqrs";
import { type Actor, SYSTEM_ACTOR } from "../../../common/domain/actor.js";

// Returns the new role's id
export class CreateRoleCommand extends Command<bigint> {
  constructor(
    readonly key: string,
    readonly name: string,
    readonly description: string | null,
    readonly permissions: string[],
    readonly actor: Actor = SYSTEM_ACTOR,
  ) {
    super();
  }
}
