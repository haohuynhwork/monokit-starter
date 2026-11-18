import { builtInPermissions } from "../../users/domain/permissions.js";
import { InvalidPostError, PostForbiddenError } from "./post.errors.js";
import {
  checkCanManageTags,
  checkTagName,
  normalizeTagNames,
  PostTag,
} from "./post-tag.js";

describe("PostTag", () => {
  it("slugs names; names that slug alike are one tag", () => {
    expect(checkTagName("  New   York ")).toEqual({
      name: "New York",
      slug: "new-york",
    });
    expect(() => checkTagName("a/b")).toThrow(InvalidPostError);
    expect(
      normalizeTagNames([
        "Travel",
        " travel",
        "",
        "Food",
      ]),
    ).toEqual([
      {
        name: "Travel",
        slug: "travel",
      },
      {
        name: "Food",
        slug: "food",
      },
    ]);
  });

  it("renames with its slug", () => {
    const tag = PostTag.create("Travel");
    tag.rename("Trips abroad");
    expect(tag.snapshot()).toMatchObject({
      slug: "trips-abroad",
    });
  });

  it("is managed by editors and admins only", () => {
    expect(() =>
      checkCanManageTags({
        id: 1n,
        permissions: builtInPermissions("author"),
      }),
    ).toThrow(PostForbiddenError);
    checkCanManageTags({
      id: 1n,
      permissions: builtInPermissions("editor"),
    });
  });
});
