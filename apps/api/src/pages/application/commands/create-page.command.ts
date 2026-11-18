import { Command } from "@nestjs/cqrs";

// A new draft without a slug; returns its id
export class CreatePageCommand extends Command<bigint> {
  constructor(
    readonly title: string,
    readonly parentId: bigint | null,
    readonly layoutId: bigint | null,
    readonly authorId: bigint,
  ) {
    super();
  }
}
