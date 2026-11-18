import { builtInPermissions } from "../../users/domain/permissions.js";
import {
  AssetForbiddenError,
  InvalidLinkUrlError,
  InvalidNameError,
  MoveIntoItselfError,
  NotAFolderError,
  NotALinkError,
} from "./asset.errors.js";
import type { AssetNode } from "./asset.js";
import {
  checkCanManage,
  checkIsLink,
  checkLinkUrl,
  checkMove,
  checkName,
  slugCandidates,
  toSlug,
} from "./asset-rules.js";

const node = (over: Partial<AssetNode> = {}): AssetNode => ({
  id: 1n,
  parentId: null,
  kind: "directory",
  visibility: "private",
  slug: "images",
  fullSlug: "images",
  filename: "Images",
  createdById: 7n,
  ...over,
});

describe("asset rules", () => {
  it("derives slugs from names, keeping /", () => {
    expect(toSlug("  Q1/Q2 Report.pdf ")).toBe("q1/q2-report.pdf");
    expect(toSlug("My   Photos")).toBe("my-photos");
    expect(slugCandidates("logo", 3)).toEqual([
      "logo",
      "logo-2",
      "logo-3",
    ]);
    expect(slugCandidates("red.png", 2)).toEqual([
      "red.png",
      "red-2.png",
    ]);
  });

  it("rejects blank or control-character names", () => {
    expect(() => checkName("   ")).toThrow(InvalidNameError);
    expect(() => checkName("a\u0000b")).toThrow(InvalidNameError);
    expect(() => checkName("x".repeat(256))).toThrow(InvalidNameError);
  });

  it("only accepts http(s) links", () => {
    expect(checkLinkUrl("https://cdn.example.com/b.jpg")).toBe(
      "https://cdn.example.com/b.jpg",
    );
    expect(() => checkLinkUrl("javascript:alert(1)")).toThrow(
      InvalidLinkUrlError,
    );
    expect(() => checkLinkUrl("/relative")).toThrow(InvalidLinkUrlError);
  });

  it("never moves a folder into itself or its subtree", () => {
    const folder = node();
    expect(() => checkMove(folder, folder, true)).toThrow(MoveIntoItselfError);
    expect(() =>
      checkMove(
        folder,
        node({
          id: 2n,
        }),
        true,
      ),
    ).toThrow(MoveIntoItselfError);
    expect(() =>
      checkMove(
        folder,
        node({
          id: 3n,
        }),
        false,
      ),
    ).not.toThrow();
    expect(() => checkMove(folder, null, false)).not.toThrow();
  });

  it("only moves into folders", () => {
    expect(() =>
      checkMove(
        node(),
        node({
          id: 2n,
          kind: "file",
        }),
        false,
      ),
    ).toThrow(NotAFolderError);
  });

  it("lets authors change only their own items", () => {
    const mine = node({
      createdById: 7n,
    });
    expect(() =>
      checkCanManage(
        {
          id: 7n,
          permissions: builtInPermissions("author"),
        },
        mine,
      ),
    ).not.toThrow();
    expect(() =>
      checkCanManage(
        {
          id: 8n,
          permissions: builtInPermissions("author"),
        },
        mine,
      ),
    ).toThrow(AssetForbiddenError);
    expect(() =>
      checkCanManage(
        {
          id: 8n,
          permissions: builtInPermissions("editor"),
        },
        mine,
      ),
    ).not.toThrow();
    expect(() => checkCanManage(null, mine)).not.toThrow();
  });

  it("changes the URL of links only", () => {
    expect(() =>
      checkIsLink(
        node({
          kind: "link",
        }),
      ),
    ).not.toThrow();
    expect(() =>
      checkIsLink(
        node({
          kind: "file",
        }),
      ),
    ).toThrow(NotALinkError);
    expect(() => checkIsLink(node())).toThrow(NotALinkError);
  });
});
