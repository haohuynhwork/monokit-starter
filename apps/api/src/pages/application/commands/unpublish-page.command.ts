import { Command } from "@nestjs/cqrs";

// Back to draft
export class UnpublishPageCommand extends Command<void> {
  constructor(readonly pageId: bigint) {
    super();
  }
}
