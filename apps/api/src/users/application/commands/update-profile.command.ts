import { Command } from "@nestjs/cqrs";
import type { UserProfile } from "../../domain/user.js";

export class UpdateProfileCommand extends Command<void> {
  constructor(
    readonly userId: bigint,
    // `phone.number` as typed; the handler parses it
    readonly profile: Partial<UserProfile>,
  ) {
    super();
  }
}
