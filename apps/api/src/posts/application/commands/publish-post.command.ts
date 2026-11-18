import { Command } from "@nestjs/cqrs";
import type { RequestMeta } from "../../../common/domain/actor.js";
import type { Actor } from "../../domain/post.js";

// Live now, or scheduled when `at` is in the future
export class PublishPostCommand extends Command<void> {
  constructor(
    readonly postId: bigint,
    readonly actor: Actor,
    readonly at?: Date,
    // Request context, for audit
    readonly meta?: RequestMeta,
  ) {
    super();
  }
}
