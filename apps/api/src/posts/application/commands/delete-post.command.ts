import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/post.js";

// Soft delete; refused while it has children
export class DeletePostCommand extends Command<void> {
  constructor(
    readonly postId: bigint,
    readonly actor: Actor,
  ) {
    super();
  }
}
