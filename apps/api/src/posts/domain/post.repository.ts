import type { Post } from "./post.js";

// Each write is one transaction keeping parentId, fullSlug and the closure
// table consistent. A path used by another live post throws PathTakenError.
export interface PostRepository {
  // Non-deleted only
  findById(id: bigint): Promise<Post | null>;
  // Inserts a new post (assigning its id) or updates one; recomputes the
  // path of it and everything below it when slug or parent changed
  save(post: Post): Promise<void>;
  // Does the post (null: the root) have a full path?
  isReachable(postId: bigint | null): Promise<boolean>;
  // The post's path in a non-default locale ('' for the root): each
  // ancestor's translated slug, else its own; null when one is missing
  pathIn(postId: bigint | null, localeId: bigint): Promise<string | null>;
  // fullSlug of a post ('' for the root); null when it has none yet
  pathOf(postId: bigint | null): Promise<string | null>;
  isInSubtree(rootId: bigint, nodeId: bigint): Promise<boolean>;
  hasLiveChildren(postId: bigint): Promise<boolean>;
}

export const POST_REPOSITORY = Symbol("POST_REPOSITORY");
