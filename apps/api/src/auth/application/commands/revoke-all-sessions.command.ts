import { Command } from "@nestjs/cqrs";

// Signs the user out everywhere (logout-all, password reset): every refresh
// token fails. Access tokens still work until they expire (up to 15 minutes).
export class RevokeAllSessionsCommand extends Command<void> {
  constructor(readonly userId: bigint) {
    super();
  }
}
