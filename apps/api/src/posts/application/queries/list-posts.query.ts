import { Query } from "@nestjs/cqrs";
import type { PostStatus } from "../../domain/post.js";
import type { PostSummary } from "./post.view.js";

export interface PostPage {
  items: PostSummary[];
  total: number;
}

// Panel listing: newest edits first, or by relevance when searching
export class ListPostsQuery extends Query<PostPage> {
  constructor(
    readonly filter: {
      status?: PostStatus;
      q?: string;
      tag?: string;
    },
    readonly limit: number,
    readonly offset: number,
  ) {
    super();
  }
}
