import { Command } from "@nestjs/cqrs";
import type { UserProfile, UserRole } from "../../domain/user.js";

// Returns the new user's id
export class CreateUserCommand extends Command<bigint> {
  constructor(
    readonly email: string,
    readonly password: string,
    // `phone.number` as typed; the handler parses it
    readonly profile: UserProfile,
    readonly role?: UserRole,
  ) {
    super();
  }
}
