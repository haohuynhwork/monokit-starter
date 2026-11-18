import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/post.js";

// The post's own folder in the media library (created on first use); the
// editor's file picker and uploads use it. Returns the folder id.
export class EnsurePostFolderCommand extends Command<bigint> {
  constructor(
    readonly postId: bigint,
    readonly actor: Actor,
  ) {
    super();
  }
}
