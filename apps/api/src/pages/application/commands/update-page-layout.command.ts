import { Command } from "@nestjs/cqrs";

export class UpdatePageLayoutCommand extends Command<void> {
  constructor(
    readonly layoutId: bigint,
    readonly changes: {
      name?: string;
      settings?: unknown;
    },
  ) {
    super();
  }
}
