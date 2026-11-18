import { Command } from "@nestjs/cqrs";

// Signs one device out: its refresh token stops working. Its access token
// still works until it expires (up to 15 minutes).
export class RevokeSessionCommand extends Command<void> {
  constructor(
    readonly userId: bigint,
    readonly sessionId: bigint,
  ) {
    super();
  }
}
