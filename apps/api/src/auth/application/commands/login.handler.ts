import {
  CommandBus,
  CommandHandler,
  EventBus,
  type ICommandHandler,
  QueryBus,
} from "@nestjs/cqrs";
import type { RequestMeta } from "../../../common/domain/actor.js";
import { VerifyCredentialsQuery } from "../../../users/application/queries/verify-credentials.query.js";
import { InvalidCredentialsError } from "../../domain/auth.errors.js";
import { LoginFailedEvent } from "../../domain/events/login-failed.event.js";
import { LoginSucceededEvent } from "../../domain/events/login-succeeded.event.js";
import type { Device } from "../../domain/session.js";
import type { TokenPair } from "../../domain/tokens.js";
import { LoginCommand } from "./login.command.js";
import { StartSessionCommand } from "./start-session.command.js";

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
    private readonly events: EventBus,
  ) {}

  async execute({ email, password, device }: LoginCommand): Promise<TokenPair> {
    const user = await this.queries.execute(
      new VerifyCredentialsQuery(email, password),
    );
    if (!user) {
      this.events.publish(
        new LoginFailedEvent("invalid_credentials", metaOfDevice(device)),
      );
      throw new InvalidCredentialsError();
    }
    const tokens = await this.commands.execute(
      new StartSessionCommand(user.id, device),
    );
    this.events.publish(
      new LoginSucceededEvent(user.id, "password", metaOfDevice(device)),
    );
    return tokens;
  }
}

function metaOfDevice(device: Device): RequestMeta {
  return {
    ip: device.ip ?? undefined,
    userAgent: device.userAgent ?? undefined,
  };
}
