import { InvalidPostError, PostForbiddenError } from "./post.errors.js";
import type { Actor } from "./post.js";

// Rules from ideas/posts/tags.md. The slug is the tag's identity: names that
// slug alike ('Travel', 'travel ') are the same tag.

export interface PostTagProps {
  id: bigint | null;
  name: string;
  slug: string;
}

export const MAX_TAGS_PER_POST = 10;

export class PostTag {
  private constructor(private props: PostTagProps) {}

  static create(name: string): PostTag {
    return new PostTag({
      id: null,
      ...checkTagName(name),
    });
  }

  static restore(props: PostTagProps): PostTag {
    return new PostTag(props);
  }

  get id(): bigint | null {
    return this.props.id;
  }

  snapshot(): Readonly<PostTagProps> {
    return this.props;
  }

  // Changes the slug too, so its /tags/<slug> URL moves
  rename(name: string): void {
    Object.assign(this.props, checkTagName(name));
  }
}

// Only editors and admins create, rename or delete tags; authors attach
// existing ones (keeps near-duplicate spellings out)
export function checkCanManageTags(actor: Actor): void {
  if (!actor.permissions.has("post:publish")) {
    throw new PostForbiddenError("Only editors and admins can manage tags");
  }
}

export function checkTagName(input: string): {
  name: string;
  slug: string;
} {
  const name = input.trim().replace(/\s+/g, " ");
  const slug = name.toLowerCase().replace(/ /g, "-");
  if (!name || name.length > 100 || /[/?#]/.test(name)) {
    throw new InvalidPostError(
      "Tag names must be 1 to 100 characters, without /, ? or #",
    );
  }
  return {
    name,
    slug,
  };
}

// Names from the editor, deduplicated by slug in their order
export function normalizeTagNames(names: string[]): {
  name: string;
  slug: string;
}[] {
  const bySlug = new Map<
    string,
    {
      name: string;
      slug: string;
    }
  >();
  for (const raw of names) {
    if (raw.trim()) {
      const tag = checkTagName(raw);
      if (!bySlug.has(tag.slug)) {
        bySlug.set(tag.slug, tag);
      }
    }
  }
  if (bySlug.size > MAX_TAGS_PER_POST) {
    throw new InvalidPostError(`At most ${MAX_TAGS_PER_POST} tags per post`);
  }
  return [
    ...bySlug.values(),
  ];
}
