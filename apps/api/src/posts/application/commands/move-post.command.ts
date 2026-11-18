import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/post.js";

// Under another post (null: the root), with everything below it
export class MovePostCommand extends Command<void> {
  constructor(
    readonly postId: bigint,
    readonly parentId: bigint | null,
    readonly actor: Actor,
  ) {
    super();
  }
}
