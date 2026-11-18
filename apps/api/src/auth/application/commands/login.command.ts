import { Command } from "@nestjs/cqrs";
import type { Device } from "../../domain/session.js";
import type { TokenPair } from "../../domain/tokens.js";

export class LoginCommand extends Command<TokenPair> {
  constructor(
    readonly email: string,
    readonly password: string,
    readonly device: Device,
  ) {
    super();
  }
}
