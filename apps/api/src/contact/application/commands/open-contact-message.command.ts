import { Command } from "@nestjs/cqrs";

// An editor opened the message: new becomes read, others stay
export class OpenContactMessageCommand extends Command<void> {
  constructor(readonly id: bigint) {
    super();
  }
}
