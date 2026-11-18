import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/post.js";

export interface PostChanges {
  title?: string;
  // HTML from the editor; sanitized before it is stored
  content?: string;
  description?: string | null;
  // Tag names in order; missing tags are created (editors and admins only)
  tags?: string[];
  // null removes the URL (drafts only)
  slug?: string | null;
}

export class UpdatePostCommand extends Command<void> {
  constructor(
    readonly postId: bigint,
    readonly changes: PostChanges,
    readonly actor: Actor,
  ) {
    super();
  }
}
