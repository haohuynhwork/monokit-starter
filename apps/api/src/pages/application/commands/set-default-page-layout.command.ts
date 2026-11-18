import { Command } from "@nestjs/cqrs";

// The layout of pages that pick none; the old default stops being it
export class SetDefaultPageLayoutCommand extends Command<void> {
  constructor(readonly layoutId: bigint) {
    super();
  }
}
