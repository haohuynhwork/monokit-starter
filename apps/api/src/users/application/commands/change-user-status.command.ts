import { Command } from "@nestjs/cqrs";
import type { UserStatus } from "../../domain/user.js";

export class ChangeUserStatusCommand extends Command<void> {
  constructor(
    readonly userId: bigint,
    readonly status: UserStatus,
  ) {
    super();
  }
}
