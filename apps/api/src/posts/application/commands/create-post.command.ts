import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/post.js";

// A new draft without a slug; returns its id
export class CreatePostCommand extends Command<bigint> {
  constructor(
    readonly title: string,
    readonly parentId: bigint | null,
    readonly actor: Actor,
  ) {
    super();
  }
}
