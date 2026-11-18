import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  PHONE_PARSER,
  type PhoneParser,
  parsePhone,
} from "../../domain/phone.js";
import { UserNotFoundError } from "../../domain/user.errors.js";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/user.repository.js";
import { UpdateProfileCommand } from "./update-profile.command.js";

@CommandHandler(UpdateProfileCommand)
export class UpdateProfileHandler
  implements ICommandHandler<UpdateProfileCommand>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PHONE_PARSER) private readonly phones: PhoneParser,
  ) {}

  async execute({ userId, profile }: UpdateProfileCommand): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    user.updateProfile(
      profile.phone === undefined
        ? profile
        : {
            ...profile,
            phone: parsePhone(this.phones, profile.phone),
          },
    );
    await this.users.save(user);
  }
}
