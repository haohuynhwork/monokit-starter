import { Query } from "@nestjs/cqrs";
import type { PublicPostView } from "./post.view.js";

// A live post by its exact path in the locale (else its default path); null
// for drafts, future posts and misses. The text is in the locale when the
// post has a translation there, else the default (ideas/i18n).
export class GetPublicPostQuery extends Query<PublicPostView | null> {
  constructor(
    readonly path: string,
    // Locale tags, best first (@RequestLocale())
    readonly locale: readonly string[] = [],
  ) {
    super();
  }
}
