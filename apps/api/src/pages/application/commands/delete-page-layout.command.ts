import { Command } from "@nestjs/cqrs";

// Refused for the default layout and while pages use it
export class DeletePageLayoutCommand extends Command<void> {
  constructor(readonly layoutId: bigint) {
    super();
  }
}
