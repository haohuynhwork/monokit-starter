import { Command } from "@nestjs/cqrs";

export class ChangePasswordCommand extends Command<void> {
  constructor(
    readonly userId: bigint,
    readonly currentPassword: string,
    readonly newPassword: string,
    // Mail "your password was changed"
    readonly notify: boolean,
  ) {
    super();
  }
}
