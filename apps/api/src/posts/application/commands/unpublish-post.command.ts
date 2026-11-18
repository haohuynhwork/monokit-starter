import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/post.js";

// Back to draft
export class UnpublishPostCommand extends Command<void> {
  constructor(
    readonly postId: bigint,
    readonly actor: Actor,
  ) {
    super();
  }
}
