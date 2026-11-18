import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/post.js";

// The header image (an asset from the media library); null removes it
export class SetPostCoverCommand extends Command<void> {
  constructor(
    readonly postId: bigint,
    readonly assetId: bigint | null,
    readonly actor: Actor,
  ) {
    super();
  }
}
