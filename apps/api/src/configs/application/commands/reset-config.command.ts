import { Command } from "@nestjs/cqrs";

export class ResetConfigCommand extends Command<void> {
  constructor(readonly key: string) {
    super();
  }
}
