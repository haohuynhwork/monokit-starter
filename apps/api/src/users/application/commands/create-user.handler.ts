import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { Email } from "../../domain/email.js";
import {
  PASSWORD_HASHER,
  Password,
  type PasswordHasher,
} from "../../domain/password.js";
import {
  PHONE_PARSER,
  type PhoneParser,
  parsePhone,
} from "../../domain/phone.js";
import { EmailTakenError } from "../../domain/user.errors.js";
import { User } from "../../domain/user.js";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/user.repository.js";
import { CreateUserCommand } from "./create-user.command.js";

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(PHONE_PARSER) private readonly phones: PhoneParser,
  ) {}

  async execute(command: CreateUserCommand): Promise<bigint> {
    const email = Email.parse(command.email);
    const password = Password.parse(command.password);
    const phone = parsePhone(this.phones, command.profile.phone);
    // Fast path; the unique index still catches a concurrent sign-up
    if (await this.users.findByEmail(email)) {
      throw new EmailTakenError();
    }

    const user = User.register({
      email,
      profile: {
        ...command.profile,
        phone,
      },
      passwordHash: await this.hasher.hash(password),
      role: command.role,
    });
    await this.users.save(user);
    return user.id!;
  }
}
