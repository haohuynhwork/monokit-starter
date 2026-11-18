import { ReservedPathError } from "../../common/domain/paths.js";
import {
  blockAssetKeys,
  blockFileKeys,
  checkBlocks,
  checkContactMessage,
  sanitizeBlocks,
} from "./block-types.js";
import {
  InvalidContactMessageError,
  InvalidPageError,
  InvalidPageLayoutError,
  LayoutInUseError,
  LayoutIsDefaultError,
  LivePageNeedsSlugError,
  MovePageIntoItselfError,
  PageNotReachableError,
  PrivateFilesInPageError,
  SidebarNeedsTemplateError,
} from "./page.errors.js";
import { Page } from "./page.js";
import {
  checkLayoutSettings,
  PageLayout,
  resolveLayout,
} from "./page-layout.js";
import {
  checkPageSettings,
  resolveOptions,
  toStored,
} from "./page-settings.js";

const now = new Date("2026-11-01T10:00:00Z");
const ok = {
  parentReachable: true,
  hasPrivateFiles: false,
};

function draft(parentId: bigint | null = null): Page {
  const page = Page.draft({
    title: " About ",
    authorId: 1n,
    parentId,
    layoutId: null,
  });
  page.assignId(5n);
  return page;
}

describe("blocks", () => {
  it("keeps known props and drops unknown ones", () => {
    const [b] = checkBlocks(
      [
        {
          id: "a",
          type: "hero",
          props: {
            title: " Hi ",
            junk: 1,
          },
        },
      ],
      "main",
    );
    expect(b).toEqual({
      id: "a",
      type: "hero",
      props: {
        title: "Hi",
      },
    });
  });

  it("refuses unknown types, duplicate ids and bad props", () => {
    expect(() =>
      checkBlocks(
        [
          {
            id: "a",
            type: "video",
            props: {},
          },
        ],
        "main",
      ),
    ).toThrow(InvalidPageError);
    const rt = {
      type: "richText",
      props: {
        html: "",
      },
    };
    expect(() =>
      checkBlocks(
        [
          {
            id: "a",
            ...rt,
          },
          {
            id: "a",
            ...rt,
          },
        ],
        "main",
      ),
    ).toThrow(/used twice/);
    expect(() =>
      checkBlocks(
        [
          {
            id: "g",
            type: "productGrid",
            props: {
              limit: 0,
              sort: "newest",
            },
          },
        ],
        "main",
      ),
    ).toThrow(/limit/);
  });

  it("allows one level of columns, no heroes in sidebars", () => {
    const inner = [
      {
        id: "x",
        type: "richText",
        props: {
          html: "a",
        },
      },
    ];
    const cols = {
      id: "c",
      type: "columns",
      props: {
        columns: [
          {
            blocks: inner,
          },
          {
            blocks: inner.map((b) => ({
              ...b,
              id: "y",
            })),
          },
        ],
      },
    };
    expect(
      checkBlocks(
        [
          cols,
        ],
        "main",
      ),
    ).toHaveLength(1);
    expect(() =>
      checkBlocks(
        [
          {
            ...cols,
            props: {
              columns: [
                {
                  blocks: [
                    cols,
                  ],
                },
                {
                  blocks: [],
                },
              ],
            },
          },
        ],
        "main",
      ),
    ).toThrow(/columns can't be used in a column/);
    expect(() =>
      checkBlocks(
        [
          {
            id: "h",
            type: "hero",
            props: {
              title: "T",
            },
          },
        ],
        "sidebar",
      ),
    ).toThrow(InvalidPageError);
    expect(() =>
      checkBlocks(
        [
          {
            id: "g",
            type: "productGrid",
            props: {
              limit: 12,
              sort: "newest",
            },
          },
        ],
        "sidebar",
      ),
    ).toThrow(/at most 8/);
  });

  it("collects file keys and sanitizes rich text, also in columns", () => {
    const blocks = checkBlocks(
      [
        {
          id: "i",
          type: "image",
          props: {
            assetKey: "a.png",
            alt: "",
          },
        },
        {
          id: "c",
          type: "columns",
          props: {
            columns: [
              {
                blocks: [
                  {
                    id: "r",
                    type: "richText",
                    props: {
                      html: '<img src="serve/818aacd3-b257-44fc-933a-a2e6d29d0e46.jpg">',
                    },
                  },
                ],
              },
              {
                blocks: [
                  {
                    id: "g",
                    type: "gallery",
                    props: {
                      assetKeys: [
                        "a.png",
                        "c.png",
                      ],
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
      "main",
    );
    expect(blockFileKeys(blocks).sort()).toEqual([
      "a.png",
      "c.png",
    ]);
    expect(blockAssetKeys(blocks)).toEqual([
      "818aacd3-b257-44fc-933a-a2e6d29d0e46.jpg",
    ]);
    const clean = sanitizeBlocks(blocks, () => "clean");
    const col = (
      clean[1]!.props.columns as {
        blocks: {
          props: {
            html: string;
          };
        }[];
      }[]
    )[0]!;
    expect(col.blocks[0]!.props.html).toBe("clean");
  });

  it("checks contact messages against the form fields", () => {
    const [form] = checkBlocks(
      [
        {
          id: "f",
          type: "contactForm",
          props: {
            fields: [
              "name",
              "email",
              "message",
            ],
          },
        },
      ],
      "main",
    );
    expect(
      checkContactMessage(form!, {
        email: "a@b.co",
        message: "Hi",
      }),
    ).toEqual({
      email: "a@b.co",
      message: "Hi",
    });
    expect(() =>
      checkContactMessage(form!, {
        message: "Hi",
      }),
    ).toThrow(InvalidContactMessageError);
    expect(() =>
      checkBlocks(
        [
          {
            id: "f",
            type: "contactForm",
            props: {
              fields: [
                "name",
              ],
            },
          },
        ],
        "main",
      ),
    ).toThrow(/email or phone/);
  });

  it("accepts a single-line subject", () => {
    const [form] = checkBlocks(
      [
        {
          id: "f",
          type: "contactForm",
          props: {
            fields: [
              "email",
              "subject",
            ],
          },
        },
      ],
      "main",
    );
    expect(
      checkContactMessage(form!, {
        email: "a@b.co",
        subject: " Quote ",
      }),
    ).toEqual({
      email: "a@b.co",
      subject: "Quote",
    });
    expect(() =>
      checkContactMessage(form!, {
        email: "a@b.co",
        subject: "a\nBcc: x@y.z",
      }),
    ).toThrow(/single line/);
    expect(() =>
      checkContactMessage(form!, {
        email: "a@b.co",
        subject: "x".repeat(256),
      }),
    ).toThrow(/255/);
  });
});

describe("settings", () => {
  it("splits layout overrides, options and blocks", () => {
    const s = checkPageSettings({
      version: 1,
      layout: {
        width: "wide",
      },
      showTitle: false,
      "seo.title": null,
      blocks: [],
    });
    expect(s.layout).toEqual({
      width: "wide",
    });
    expect(resolveOptions(s)).toMatchObject({
      showTitle: false,
      "seo.title": null,
    });
    expect(toStored(s)).toMatchObject({
      version: 1,
      showTitle: false,
      blocks: [],
    });
  });

  it("refuses unknown options and page-level template or sidebar", () => {
    expect(() =>
      checkPageSettings({
        color: "red",
        blocks: [],
      }),
    ).toThrow(/Unknown/);
    expect(() =>
      checkPageSettings({
        layout: {
          template: "landing",
        },
        blocks: [],
      }),
    ).toThrow(/template and sidebar/);
  });
});

describe("layouts", () => {
  it("needs the sidebar template for a sidebar", () => {
    expect(() =>
      checkLayoutSettings({
        sidebar: {
          blocks: [],
        },
      }),
    ).toThrow(SidebarNeedsTemplateError);
    expect(
      checkLayoutSettings({
        template: "sidebar",
        sidebar: {},
      }).sidebar,
    ).toEqual({
      side: "right",
      sticky: false,
      blocks: [],
    });
    expect(() =>
      checkLayoutSettings({
        width: "huge",
      }),
    ).toThrow(InvalidPageLayoutError);
  });

  it("resolves page override, then layout, then code default", () => {
    const layout = checkLayoutSettings({
      width: "wide",
      header: "minimal",
    });
    expect(
      resolveLayout(layout, {
        header: "none",
      }),
    ).toMatchObject({
      template: "default",
      width: "wide",
      header: "none",
      sidebar: null,
    });
  });

  it("can't delete the default or a used layout", () => {
    const l = PageLayout.create({
      name: "Shop",
      settings: {},
    });
    expect(() => l.delete(now, true)).toThrow(LayoutInUseError);
    l.makeDefault();
    expect(() => l.delete(now, false)).toThrow(LayoutIsDefaultError);
  });
});

describe("Page", () => {
  it("starts as a slugless draft with a trimmed title", () => {
    expect(draft().snapshot()).toMatchObject({
      title: "About",
      slug: null,
      status: "draft",
    });
  });

  it("refuses reserved root slugs but not nested ones", () => {
    expect(() => draft().setSlug("Panel")).toThrow(ReservedPathError);
    const child = draft(1n);
    child.setSlug("panel");
    expect(child.slug).toBe("panel");
    expect(() => child.moveTo(null, false)).toThrow(ReservedPathError);
  });

  it("publishes only when reachable and without private files", () => {
    const page = draft();
    expect(() => page.publish(now, ok)).toThrow(PageNotReachableError);
    page.setSlug("about");
    expect(() =>
      page.publish(now, {
        ...ok,
        hasPrivateFiles: true,
      }),
    ).toThrow(PrivateFilesInPageError);
    page.publish(now, ok);
    expect(page.snapshot().status).toBe("published");
    expect(() => page.setSlug(null)).toThrow(LivePageNeedsSlugError);
  });

  it("can't move under itself", () => {
    expect(() => draft().moveTo(5n, false)).toThrow(MovePageIntoItselfError);
    expect(() => draft().moveTo(7n, true)).toThrow(MovePageIntoItselfError);
  });
});
