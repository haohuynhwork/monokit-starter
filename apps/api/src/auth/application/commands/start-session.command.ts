import { Command } from "@nestjs/cqrs";
import type { Device } from "../../domain/session.js";
import type { TokenPair } from "../../domain/tokens.js";

// Signs a user in on one device: a new session row and its first tokens.
// Used after login and sign-up; the user must be allowed to sign in.
export class StartSessionCommand extends Command<TokenPair> {
  constructor(
    readonly userId: bigint,
    readonly device: Device,
  ) {
    super();
  }
}
