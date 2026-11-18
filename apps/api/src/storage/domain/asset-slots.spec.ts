import { InvalidAssetSlotError } from "./asset.errors.js";
import { checkAssetSlot } from "./asset-slots.js";

describe("checkAssetSlot", () => {
  it("knows single slots and lists", () => {
    expect(checkAssetSlot("user", "avatar")).toEqual({
      single: true,
    });
    expect(checkAssetSlot("post", "gallery")).toEqual({
      single: false,
    });
  });

  it("rejects unknown slots and owner types", () => {
    expect(() => checkAssetSlot("user", "gallery")).toThrow(
      InvalidAssetSlotError,
    );
    expect(() => checkAssetSlot("comment", "avatar")).toThrow(
      InvalidAssetSlotError,
    );
  });
});
