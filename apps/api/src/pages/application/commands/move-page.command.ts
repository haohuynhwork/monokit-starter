import { Command } from "@nestjs/cqrs";

// Under another page, or to the root (null)
export class MovePageCommand extends Command<void> {
  constructor(
    readonly pageId: bigint,
    readonly parentId: bigint | null,
  ) {
    super();
  }
}
