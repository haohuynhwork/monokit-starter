import { describe, expect, it } from "vitest";
import { parseAcceptLanguage } from "./request-locale.js";

describe("parseAcceptLanguage", () => {
  it("orders by q, keeping header order on ties", () => {
    expect(parseAcceptLanguage("en;q=0.5, vi-VN, vi;q=0.9")).toEqual([
      "vi-VN",
      "vi",
      "en",
    ]);
  });

  it("drops wildcards, q=0 and empty input", () => {
    expect(parseAcceptLanguage("*, fr;q=0")).toEqual([]);
    expect(parseAcceptLanguage(undefined)).toEqual([]);
  });
});
