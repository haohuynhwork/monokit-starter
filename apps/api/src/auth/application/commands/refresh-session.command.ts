import { Command } from "@nestjs/cqrs";
import type { TokenPair } from "../../domain/tokens.js";

// Rotates the session's refresh token and issues a new access token
export class RefreshSessionCommand extends Command<TokenPair> {
  constructor(readonly refreshToken: string) {
    super();
  }
}
