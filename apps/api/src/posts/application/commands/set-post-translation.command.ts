import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/post.js";

export interface PostTranslationText {
  title: string;
  // null: keep the post's own slug in this locale
  slug: string | null;
  // HTML from the editor; sanitized before it is stored
  content: string;
  description: string | null;
}

// Writes (or replaces) the post's text in a non-default locale
export class SetPostTranslationCommand extends Command<void> {
  constructor(
    readonly postId: bigint,
    // Locale code, e.g. 'vi-VN'
    readonly locale: string,
    readonly text: PostTranslationText,
    readonly actor: Actor,
  ) {
    super();
  }
}
