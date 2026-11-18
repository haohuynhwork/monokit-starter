import { Inject, Logger } from "@nestjs/common";
import { CommandBus, CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  PASSWORD_HASHER,
  Password,
  type PasswordHasher,
} from "../../domain/password.js";
import {
  UserNotFoundError,
  WrongPasswordError,
} from "../../domain/user.errors.js";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/user.repository.js";
import { ChangePasswordCommand } from "./change-password.command.js";
import { sendPasswordChangedNotice } from "./password-changed-notice.js";

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler
  implements ICommandHandler<ChangePasswordCommand>
{
  private readonly logger = new Logger(ChangePasswordHandler.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly commands: CommandBus,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    const hash = user.passwordHash;
    if (!hash || !(await this.hasher.verify(hash, command.currentPassword))) {
      throw new WrongPasswordError();
    }
    const password = Password.parse(command.newPassword);
    user.changePassword(await this.hasher.hash(password));
    await this.users.save(user);
    if (command.notify) {
      sendPasswordChangedNotice(this.commands, this.logger, user);
    }
  }
}
