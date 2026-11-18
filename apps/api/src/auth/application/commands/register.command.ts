import { Command } from "@nestjs/cqrs";

// Public sign-up; returns the new user's id
export class RegisterCommand extends Command<bigint> {
  constructor(
    readonly email: string,
    readonly password: string,
    readonly displayName: string,
  ) {
    super();
  }
}
