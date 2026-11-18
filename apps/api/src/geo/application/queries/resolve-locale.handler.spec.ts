import { describe, expect, it } from "vitest";
import { pickLocale } from "./resolve-locale.handler.js";

const locales = [
  {
    id: 1n,
    code: "en-US",
    rtl: false,
    isDefault: true,
  },
  {
    id: 2n,
    code: "vi-VN",
    rtl: false,
    isDefault: false,
  },
];

describe("pickLocale", () => {
  it("matches the code case-insensitively", () => {
    expect(
      pickLocale(
        [
          "vi-vn",
        ],
        locales,
      ),
    ).toMatchObject({
      code: "vi-VN",
      isDefault: false,
      defaultCode: "en-US",
    });
  });

  it("falls back to the language part, then the default", () => {
    expect(
      pickLocale(
        [
          "fr",
          "vi",
        ],
        locales,
      ).code,
    ).toBe("vi-VN");
    expect(
      pickLocale(
        [
          "fr",
        ],
        locales,
      ),
    ).toMatchObject({
      code: "en-US",
      isDefault: true,
    });
    expect(pickLocale([], locales).code).toBe("en-US");
  });

  it("treats a site without locales as all-default", () => {
    expect(
      pickLocale(
        [
          "vi",
        ],
        [],
      ),
    ).toMatchObject({
      code: "und",
      isDefault: true,
    });
  });
});
