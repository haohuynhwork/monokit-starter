import { DomainError } from "../../common/domain/domain-error.js";

export class PostNotFoundError extends DomainError {
  readonly code = "post_not_found";
  readonly kind = "not_found";
  constructor() {
    super("Post not found");
  }
}

export class InvalidPostError extends DomainError {
  readonly code = "invalid_post";
  readonly kind = "invalid";
}

export class PathTakenError extends DomainError {
  readonly code = "path_taken";
  readonly kind = "conflict";
  constructor() {
    super("Another post already has this path");
  }
}

export class PostNotReachableError extends DomainError {
  readonly code = "post_not_reachable";
  readonly kind = "invalid";
  constructor() {
    super("Give the post (and every parent) a slug before publishing");
  }
}

export class LivePostNeedsSlugError extends DomainError {
  readonly code = "live_post_needs_slug";
  readonly kind = "conflict";
  constructor() {
    super("A published or scheduled post must keep a slug; unpublish it first");
  }
}

export class PrivateFilesInPostError extends DomainError {
  readonly code = "private_files_in_post";
  readonly kind = "conflict";
  constructor() {
    super("Make the post’s files public before publishing it");
  }
}

export class PostHasChildrenError extends DomainError {
  readonly code = "post_has_children";
  readonly kind = "conflict";
  constructor() {
    super("Move or delete the posts under it first");
  }
}

export class MovePostIntoItselfError extends DomainError {
  readonly code = "move_post_into_itself";
  readonly kind = "invalid";
  constructor() {
    super("A post cannot be moved under itself or its children");
  }
}

export class PostForbiddenError extends DomainError {
  readonly code = "post_forbidden";
  readonly kind = "forbidden";
}

export class LiveDescendantNeedsPathError extends DomainError {
  readonly code = "live_descendant_needs_path";
  readonly kind = "conflict";
  constructor() {
    super(
      "A published post below this one would lose its URL; unpublish it first",
    );
  }
}

export class PostTagNotFoundError extends DomainError {
  readonly code = "post_tag_not_found";
  readonly kind = "not_found";
  constructor() {
    super("Tag not found");
  }
}

export class PostTagTakenError extends DomainError {
  readonly code = "post_tag_taken";
  readonly kind = "conflict";
  constructor() {
    super("Another tag already has this name");
  }
}
