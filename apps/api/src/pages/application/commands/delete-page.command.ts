import { Command } from "@nestjs/cqrs";

// Soft delete; refused while it has pages under it
export class DeletePageCommand extends Command<void> {
  constructor(readonly pageId: bigint) {
    super();
  }
}
