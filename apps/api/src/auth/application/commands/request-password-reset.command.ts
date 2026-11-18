import { Command } from "@nestjs/cqrs";

// Mails a reset link when the email belongs to an account that may reset;
// otherwise does nothing. Never tells the caller which.
export class RequestPasswordResetCommand extends Command<void> {
  constructor(readonly email: string) {
    super();
  }
}
