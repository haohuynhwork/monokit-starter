import { Command } from "@nestjs/cqrs";

// Now, or at a future `at` (scheduled)
export class PublishPageCommand extends Command<void> {
  constructor(
    readonly pageId: bigint,
    readonly at?: Date,
  ) {
    super();
  }
}
