import { Inject, Logger } from "@nestjs/common";
import { CommandBus, CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  PASSWORD_HASHER,
  Password,
  type PasswordHasher,
} from "../../domain/password.js";
import { UserNotFoundError } from "../../domain/user.errors.js";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/user.repository.js";
import { sendPasswordChangedNotice } from "./password-changed-notice.js";
import { ResetPasswordCommand } from "./reset-password.command.js";

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler
  implements ICommandHandler<ResetPasswordCommand>
{
  private readonly logger = new Logger(ResetPasswordHandler.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly commands: CommandBus,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    const password = Password.parse(command.newPassword);
    const user = await this.users.findById(command.userId);
    if (!user?.canResetPassword) {
      throw new UserNotFoundError();
    }
    user.changePassword(await this.hasher.hash(password));
    // Sessions are auth's: ResetPasswordWithTokenHandler revokes them
    await this.users.save(user);
    if (command.notify) {
      sendPasswordChangedNotice(this.commands, this.logger, user);
    }
  }
}
