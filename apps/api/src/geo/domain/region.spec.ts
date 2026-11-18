import { describe, expect, it } from "vitest";
import { Region } from "./region.js";

const vn = (code = "vn-hn") =>
  Region.create({
    countryCode: "vn",
    code,
    name: " Hà Nội ",
    parent: null,
  });

describe("Region", () => {
  it("normalises the country, code and name", () => {
    expect(vn().snapshot()).toMatchObject({
      countryCode: "VN",
      code: "VN-HN",
      name: "Hà Nội",
      active: true,
    });
  });

  it("refuses a code outside the country's prefix", () => {
    expect(() => vn("US-CA")).toThrow(/start with VN-/);
    expect(() => vn("VN HN")).toThrow(/look like/);
  });

  it("keeps parents in the same country", () => {
    expect(() =>
      Region.create({
        countryCode: "VN",
        code: "VN-HN-01",
        name: "Ward",
        parent: {
          id: 1n,
          countryCode: "US",
        },
      }),
    ).toThrow(/another country/);
  });

  it("refuses cycles", () => {
    const r = Region.restore({
      ...vn().snapshot(),
      id: 1n,
    });
    expect(() =>
      r.moveTo(
        {
          id: 2n,
          countryCode: "VN",
        },
        [
          2n,
          1n,
        ],
      ),
    ).toThrow(/under itself/);
    r.moveTo(
      {
        id: 3n,
        countryCode: "VN",
      },
      [
        3n,
      ],
    );
    expect(r.snapshot().parentId).toBe(3n);
  });

  it("deactivates", () => {
    const r = vn();
    r.update({
      active: false,
    });
    expect(r.snapshot().active).toBe(false);
  });
});
