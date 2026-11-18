import { describe, expect, it } from "vitest";
import { Locale } from "./locale.js";

const lang = (code: string, isDefault = false) =>
  Locale.create({
    code,
    name: "X",
    isDefault,
  });

describe("Locale", () => {
  it("canonicalises BCP 47 codes", () => {
    expect(lang("EN_us").snapshot().code).toBe("en-US");
    expect(lang("zh-hant").snapshot().code).toBe("zh-Hant");
    expect(() => lang("english")).toThrow(/BCP 47/);
  });

  it("defaults nativeName to name", () => {
    expect(lang("vi").snapshot().nativeName).toBe("X");
  });

  it("protects the default", () => {
    const en = lang("en", true);
    expect(() =>
      en.update({
        active: false,
      }),
    ).toThrow(/default/);
    expect(() =>
      en.update({
        isDefault: false,
      }),
    ).toThrow(/default/);
    expect(() => en.checkDeletable()).toThrow(/default/);
  });

  it("only makes active locales the default", () => {
    const vi = lang("vi");
    vi.update({
      active: false,
    });
    expect(() =>
      vi.update({
        isDefault: true,
      }),
    ).toThrow(/Activate/);
    vi.update({
      active: true,
      isDefault: true,
    });
    expect(vi.isDefault).toBe(true);
  });
});
