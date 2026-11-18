import { DefaultLocaleTranslationError } from "../../common/domain/translation.js";
import { InvalidPostError } from "./post.errors.js";
import { Post } from "./post.js";

const vi = {
  id: 2n,
  isDefault: false,
};
const en = {
  id: 1n,
  isDefault: true,
};
const text = {
  title: " Xin chào ",
  slug: "Xin Chao",
  content: "<p>Chào</p>",
  description: "  ",
};

function post(): Post {
  return Post.draft({
    title: "Hello",
    authorId: 1n,
    parentId: null,
  });
}

describe("Post translations", () => {
  it("stores cleaned text per locale and replaces it on a second write", () => {
    const p = post();
    p.translate(vi, text);
    expect(p.translation(2n)).toEqual({
      localeId: 2n,
      title: "Xin chào",
      slug: "xin-chao",
      content: "<p>Chào</p>",
      description: null,
    });
    p.translate(vi, {
      ...text,
      title: "Chào",
    });
    expect(p.snapshot().translations).toHaveLength(1);
    expect(p.translation(2n)?.title).toBe("Chào");
  });

  it("keeps the post's own slug when none is given", () => {
    const p = post();
    p.translate(vi, {
      ...text,
      slug: " ",
    });
    expect(p.translation(2n)?.slug).toBeNull();
  });

  it("refuses the default locale and bad text", () => {
    expect(() => post().translate(en, text)).toThrow(
      DefaultLocaleTranslationError,
    );
    expect(() =>
      post().translate(vi, {
        ...text,
        title: " ",
      }),
    ).toThrow(InvalidPostError);
    expect(() =>
      post().translate(vi, {
        ...text,
        slug: "a?b",
      }),
    ).toThrow(InvalidPostError);
  });

  it("removes a translation and lists every locale's content", () => {
    const p = post();
    p.edit({
      content: "<p>Hi</p>",
    });
    p.translate(vi, text);
    expect(p.allContent).toContain("<p>Chào</p>");
    p.removeTranslation(2n);
    expect(p.translation(2n)).toBeNull();
    expect(p.allContent).toBe("<p>Hi</p>");
  });
});
