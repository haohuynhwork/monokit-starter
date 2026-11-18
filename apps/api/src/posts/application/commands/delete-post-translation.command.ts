import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/post.js";

// The locale falls back to the post's default text again
export class DeletePostTranslationCommand extends Command<void> {
  constructor(
    readonly postId: bigint,
    readonly locale: string,
    readonly actor: Actor,
  ) {
    super();
  }
}
