import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/post.js";

// Moves its /tags/<slug> URL; refused when another tag has the new slug
export class RenamePostTagCommand extends Command<void> {
  constructor(
    readonly tagId: bigint,
    readonly name: string,
    readonly actor: Actor,
  ) {
    super();
  }
}
