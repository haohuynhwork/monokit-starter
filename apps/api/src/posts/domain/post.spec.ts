import { inlineAssetKeys, inlineFileKeys } from "../../common/domain/html.js";
import { builtInPermissions } from "../../users/domain/permissions.js";
import {
  InvalidPostError,
  LivePostNeedsSlugError,
  MovePostIntoItselfError,
  PostForbiddenError,
  PostHasChildrenError,
  PostNotReachableError,
  PrivateFilesInPostError,
} from "./post.errors.js";
import { checkCanEdit, checkCanPublish, Post, toSlug } from "./post.js";

const now = new Date("2026-11-01T10:00:00Z");
const ok = {
  parentReachable: true,
  hasPrivateFiles: false,
};

function draft(authorId = 1n): Post {
  const post = Post.draft({
    title: " Hello ",
    authorId,
    parentId: null,
  });
  post.assignId(9n);
  return post;
}

describe("Post", () => {
  it("starts as a slugless draft with a trimmed title", () => {
    const post = draft();
    expect(post.snapshot()).toMatchObject({
      title: "Hello",
      slug: null,
      status: "draft",
    });
  });

  it("normalizes slugs", () => {
    expect(toSlug("  Hello  World/Part 2 ")).toBe("hello-world/part-2");
    expect(() => toSlug("a?b")).toThrow(InvalidPostError);
  });

  it("keeps each tag once, at most ten", () => {
    const post = draft();
    post.setTags([
      3n,
      1n,
    ]);
    expect(post.snapshot().tagIds).toEqual([
      3n,
      1n,
    ]);
    expect(() =>
      post.setTags([
        1n,
        1n,
      ]),
    ).toThrow(InvalidPostError);
    expect(() =>
      post.setTags(
        Array.from(
          {
            length: 11,
          },
          (_, i) => BigInt(i + 1),
        ),
      ),
    ).toThrow(InvalidPostError);
  });

  it("needs a path and only public files to publish", () => {
    const post = draft();
    expect(() => post.publish(now, ok)).toThrow(PostNotReachableError);
    post.setSlug("hello");
    expect(() =>
      post.publish(now, {
        ...ok,
        parentReachable: false,
      }),
    ).toThrow(PostNotReachableError);
    expect(() =>
      post.publish(now, {
        ...ok,
        hasPrivateFiles: true,
      }),
    ).toThrow(PrivateFilesInPostError);
    post.publish(now, ok);
    expect(post.snapshot()).toMatchObject({
      status: "published",
      publishedAt: now.toISOString(),
    });
  });

  it("schedules when the time is in the future", () => {
    const post = draft();
    post.setSlug("later");
    post.publish(now, ok, new Date("2026-12-01T00:00:00Z"));
    expect(post.snapshot().status).toBe("scheduled");
  });

  it("keeps the slug of a live post", () => {
    const post = draft();
    post.setSlug("hello");
    post.publish(now, ok);
    expect(() => post.setSlug(null)).toThrow(LivePostNeedsSlugError);
    post.unpublish();
    post.setSlug(null);
    expect(post.slug).toBeNull();
  });

  it("never moves under itself, nor deletes with children", () => {
    const post = draft();
    expect(() => post.moveTo(9n, false)).toThrow(MovePostIntoItselfError);
    expect(() => post.moveTo(5n, true)).toThrow(MovePostIntoItselfError);
    expect(() => post.delete(now, true)).toThrow(PostHasChildrenError);
  });

  it("lets authors edit only their posts, and never publish", () => {
    const post = draft(1n);
    expect(() =>
      checkCanEdit(
        {
          id: 1n,
          permissions: builtInPermissions("author"),
        },
        post,
      ),
    ).not.toThrow();
    expect(() =>
      checkCanEdit(
        {
          id: 2n,
          permissions: builtInPermissions("author"),
        },
        post,
      ),
    ).toThrow(PostForbiddenError);
    expect(() =>
      checkCanPublish(
        {
          id: 1n,
          permissions: builtInPermissions("author"),
        },
        post,
      ),
    ).toThrow(PostForbiddenError);
    expect(() =>
      checkCanPublish(
        {
          id: 2n,
          permissions: builtInPermissions("editor"),
        },
        post,
      ),
    ).not.toThrow();
  });

  it("finds inline images of our own files", () => {
    const html =
      '<p><img src="/files/assets/a.png"><img src="https://x.test/b.png"><img src="/files/assets/a.png"></p>';
    expect(inlineFileKeys(html)).toEqual([
      "assets/a.png",
    ]);
  });

  it("finds 'serve/<key>' images and links", () => {
    const html =
      '<p><img src="serve/818aacd3-b257-44fc-933a-a2e6d29d0e46.jpg"><a href="serve/07e745fc-9dc3-49f5-a553-8612cf7b1795">doc</a><img src="serve/818aacd3-b257-44fc-933a-a2e6d29d0e46.jpg"><img src="serve/12"><img src="serve/products/x/a.png"><img src="/serve/818aacd3-b257-44fc-933a-a2e6d29d0e46.jpg"></p>';
    expect(inlineAssetKeys(html)).toEqual([
      "818aacd3-b257-44fc-933a-a2e6d29d0e46.jpg",
      "07e745fc-9dc3-49f5-a553-8612cf7b1795",
    ]);
  });
});
