import { Query } from "@nestjs/cqrs";
import type { PublicPostView } from "./post.view.js";

// Which live posts: `tag` is a tag slug (its /tags/<slug> page), `tagId` a
// tag id (a postList block), `q` a full-text search of title and content
export interface PublicPostFilter {
  tag?: string;
  tagId?: bigint;
  q?: string;
}

// Latest live posts for the site, newest first (bodies left out); with `q`,
// best matches first
export class ListPublicPostsQuery extends Query<PublicPostView[]> {
  constructor(
    readonly limit: number,
    readonly tag?: string,
    readonly tagId?: bigint,
    readonly q?: string,
    readonly offset = 0,
    // Locale tags, best first (@RequestLocale()); default text without one
    readonly locale: readonly string[] = [],
  ) {
    super();
  }
}

// How many live posts match, for paging
export class CountPublicPostsQuery extends Query<number> {
  constructor(readonly filter: PublicPostFilter) {
    super();
  }
}
