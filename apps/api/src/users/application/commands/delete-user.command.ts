import { Command } from "@nestjs/cqrs";
import { type Actor, SYSTEM_ACTOR } from "../../../common/domain/actor.js";

export class DeleteUserCommand extends Command<void> {
  constructor(
    readonly userId: bigint,
    readonly actor: Actor = SYSTEM_ACTOR,
  ) {
    super();
  }
}
