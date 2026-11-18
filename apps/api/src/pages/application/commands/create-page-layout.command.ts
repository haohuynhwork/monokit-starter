import { Command } from "@nestjs/cqrs";

// Returns the new layout's id
export class CreatePageLayoutCommand extends Command<bigint> {
  constructor(
    readonly name: string,
    // Raw JSON, checked by the domain (ideas/pages "Layout")
    readonly settings: unknown,
  ) {
    super();
  }
}
