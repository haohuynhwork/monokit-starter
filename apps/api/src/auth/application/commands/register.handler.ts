import { CommandBus, CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { CreateUserCommand } from "../../../users/application/commands/create-user.command.js";
import { RegisterCommand } from "./register.command.js";

// Users own the account rules; sign-up always gets the default role
@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand> {
  constructor(private readonly commands: CommandBus) {}

  execute({ email, password, displayName }: RegisterCommand): Promise<bigint> {
    return this.commands.execute(
      new CreateUserCommand(email, password, {
        displayName,
        shortName: null,
        givenName: null,
        familyName: null,
        phone: null,
      }),
    );
  }
}
