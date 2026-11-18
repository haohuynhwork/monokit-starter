import { Query } from "@nestjs/cqrs";
import type { PostView } from "./post.view.js";

// Non-deleted only; null when missing
export class GetPostQuery extends Query<PostView | null> {
  constructor(readonly postId: bigint) {
    super();
  }
}
