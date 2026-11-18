import { Command } from "@nestjs/cqrs";

// Sets a new password from a reset link's token
export class ResetPasswordWithTokenCommand extends Command<void> {
  constructor(
    readonly token: string,
    readonly newPassword: string,
    // Mail "your password was changed"
    readonly notify: boolean,
  ) {
    super();
  }
}
