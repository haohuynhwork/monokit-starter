import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/post.js";

// Hard delete; posts lose the tag
export class DeletePostTagCommand extends Command<void> {
  constructor(
    readonly tagId: bigint,
    readonly actor: Actor,
  ) {
    super();
  }
}
