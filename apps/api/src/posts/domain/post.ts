import {
  checkTranslatable,
  type TranslationLocale,
} from "../../common/domain/translation.js";
import {
  InvalidPostError,
  LivePostNeedsSlugError,
  MovePostIntoItselfError,
  PostForbiddenError,
  PostHasChildrenError,
  PostNotReachableError,
  PrivateFilesInPostError,
} from "./post.errors.js";
import { MAX_TAGS_PER_POST } from "./post-tag.js";

// Rules from ideas/posts/index.md. The tree (parentId, fullSlug, closure) is
// kept consistent by the repository.

export type PostStatus = "draft" | "scheduled" | "published";

export type Actor = {
  id: bigint;
  permissions: ReadonlySet<string>;
};

export interface PostProps {
  id: bigint | null;
  parentId: bigint | null;
  authorId: bigint | null;
  title: string;
  slug: string | null;
  content: string;
  description: string | null;
  // PostTag ids in display order; the post owns its taggings
  tagIds: bigint[];
  status: PostStatus;
  publishedAt: string | null;
  deletedAt: string | null;
  // Text in the non-default locales (ideas/i18n); the props above are the
  // default locale's
  translations: PostTranslationProps[];
}

export interface PostTranslationProps {
  localeId: bigint;
  title: string;
  // null: the post's own slug in this locale's path
  slug: string | null;
  content: string;
  description: string | null;
}

export class Post {
  private constructor(private props: PostProps) {}

  static draft(input: {
    title: string;
    authorId: bigint;
    parentId: bigint | null;
  }): Post {
    return new Post({
      id: null,
      parentId: input.parentId,
      authorId: input.authorId,
      title: checkTitle(input.title),
      slug: null,
      content: "",
      description: null,
      tagIds: [],
      status: "draft",
      publishedAt: null,
      deletedAt: null,
      translations: [],
    });
  }

  static restore(props: PostProps): Post {
    return new Post(props);
  }

  get id(): bigint | null {
    return this.props.id;
  }
  get parentId(): bigint | null {
    return this.props.parentId;
  }
  get slug(): string | null {
    return this.props.slug;
  }
  get content(): string {
    return this.props.content;
  }
  // Every locale's content, for the files it uses
  get allContent(): string {
    return [
      this.props.content,
      ...this.props.translations.map((t) => t.content),
    ].join("\n");
  }
  get isLive(): boolean {
    return this.props.status !== "draft";
  }

  translation(localeId: bigint): PostTranslationProps | null {
    return this.props.translations.find((t) => t.localeId === localeId) ?? null;
  }

  snapshot(): Readonly<PostProps> {
    return this.props;
  }

  assignId(id: bigint): void {
    this.props.id = id;
  }

  // `content` must already be sanitized (HtmlSanitizer)
  edit(changes: {
    title?: string;
    content?: string;
    description?: string | null;
  }): void {
    if (changes.title !== undefined) {
      this.props.title = checkTitle(changes.title);
    }
    if (changes.content !== undefined) {
      this.props.content = changes.content;
    }
    if (changes.description !== undefined) {
      this.props.description = checkDescription(changes.description);
    }
  }

  // Sets the post's text in a non-default locale (replacing it). `content`
  // must already be sanitized.
  translate(
    locale: TranslationLocale,
    text: {
      title: string;
      slug: string | null;
      content: string;
      description: string | null;
    },
  ): void {
    checkTranslatable(locale);
    const next: PostTranslationProps = {
      localeId: locale.id,
      title: checkTitle(text.title),
      slug: text.slug === null || !text.slug.trim() ? null : toSlug(text.slug),
      content: text.content,
      description: checkDescription(text.description),
    };
    this.props.translations = [
      ...this.props.translations.filter((t) => t.localeId !== locale.id),
      next,
    ];
  }

  // The locale falls back to the default text again
  removeTranslation(localeId: bigint): void {
    this.props.translations = this.props.translations.filter(
      (t) => t.localeId !== localeId,
    );
  }

  // Ids of existing tags (resolved from names by the handler)
  setTags(tagIds: bigint[]): void {
    if (new Set(tagIds).size !== tagIds.length) {
      throw new InvalidPostError("A tag can only be on a post once");
    }
    if (tagIds.length > MAX_TAGS_PER_POST) {
      throw new InvalidPostError(`At most ${MAX_TAGS_PER_POST} tags per post`);
    }
    this.props.tagIds = [
      ...tagIds,
    ];
  }

  // Changing it moves the post's URL and every URL below it
  setSlug(slug: string | null): void {
    const next = slug === null ? null : toSlug(slug);
    if (next === null && this.isLive) {
      throw new LivePostNeedsSlugError();
    }
    this.props.slug = next;
  }

  // `targetInsideSubtree`: the new parent is this post or below it
  moveTo(parentId: bigint | null, targetInsideSubtree: boolean): void {
    if (
      parentId !== null &&
      (parentId === this.props.id || targetInsideSubtree)
    ) {
      throw new MovePostIntoItselfError();
    }
    this.props.parentId = parentId;
  }

  // `at` in the future schedules it. Facts from outside the aggregate:
  // whether every ancestor has a slug, and whether any used file is
  // private (a public page can't show those).
  publish(
    now: Date,
    facts: {
      parentReachable: boolean;
      hasPrivateFiles: boolean;
    },
    at?: Date,
  ): void {
    if (this.props.slug === null || !facts.parentReachable) {
      throw new PostNotReachableError();
    }
    if (facts.hasPrivateFiles) {
      throw new PrivateFilesInPostError();
    }
    const when = at ?? now;
    this.props.status =
      when.getTime() > now.getTime() ? "scheduled" : "published";
    this.props.publishedAt = when.toISOString();
  }

  unpublish(): void {
    this.props.status = "draft";
    this.props.publishedAt = null;
  }

  delete(now: Date, hasChildren: boolean): void {
    if (hasChildren) {
      throw new PostHasChildrenError();
    }
    this.props.deletedAt = now.toISOString();
  }
}

// Everyone edits their own posts; post:edit:any covers anyone's (ideas/users
// roles)
export function checkCanEdit(actor: Actor, post: Post): void {
  if (
    !actor.permissions.has("post:edit:any") &&
    post.snapshot().authorId !== actor.id
  ) {
    throw new PostForbiddenError("You can only edit your own posts");
  }
}

// Only those with post:publish put posts live or take them down
export function checkCanPublish(actor: Actor, post: Post): void {
  checkCanEdit(actor, post);
  if (!actor.permissions.has("post:publish")) {
    throw new PostForbiddenError("Only editors and admins can publish");
  }
}

export function checkTitle(title: string): string {
  const clean = title.trim();
  if (!clean || clean.length > 255) {
    throw new InvalidPostError("Title must be 1 to 255 characters");
  }
  return clean;
}

function checkDescription(description: string | null): string | null {
  const clean = description?.trim() ?? "";
  if (clean.length > 500) {
    throw new InvalidPostError("Description must be at most 500 characters");
  }
  return clean || null;
}

// 'Hello World' -> 'hello-world'; '/' is allowed (ideas/posts)
export function toSlug(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "");
  // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting them
  // oxlint-disable-next-line no-control-regex
  if (!slug || slug.length > 255 || /[\u0000-\u001f\u007f?#]/.test(slug)) {
    throw new InvalidPostError(
      "Slug must be 1 to 255 characters, without ? or #",
    );
  }
  return slug;
}
