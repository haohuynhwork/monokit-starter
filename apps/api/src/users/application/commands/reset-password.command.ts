import { Command } from "@nestjs/cqrs";

// Sets a new password without the current one: the caller (auth's reset
// link) has proved the request. Refused unless the user may reset.
export class ResetPasswordCommand extends Command<void> {
  constructor(
    readonly userId: bigint,
    readonly newPassword: string,
    // Mail "your password was changed"
    readonly notify: boolean,
  ) {
    super();
  }
}
