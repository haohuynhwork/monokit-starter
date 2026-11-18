import { Command } from "@nestjs/cqrs";
import { type Actor, SYSTEM_ACTOR } from "../../../common/domain/actor.js";
import type { UserRole } from "../../domain/user.js";

export class ChangeUserRoleCommand extends Command<void> {
  constructor(
    readonly userId: bigint,
    readonly role: UserRole,
    readonly actor: Actor = SYSTEM_ACTOR,
  ) {
    super();
  }
}
