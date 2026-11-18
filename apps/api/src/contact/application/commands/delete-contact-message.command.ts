import { Command } from "@nestjs/cqrs";

export class DeleteContactMessageCommand extends Command<void> {
  constructor(readonly id: bigint) {
    super();
  }
}
