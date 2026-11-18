import { describe, expect, it } from "vitest";
import { parsePhone } from "../domain/phone.js";
import { InvalidPhoneError } from "../domain/user.errors.js";
import { GeoPhoneParser } from "./geo-phone-parser.js";

const parser = new GeoPhoneParser();

describe("parsePhone", () => {
  it("keeps the country and the national number without the trunk 0", () => {
    expect(
      parsePhone(parser, {
        country: "vn",
        number: "0901 234 567",
      }),
    ).toEqual({
      country: "VN",
      number: "901234567",
    });
  });

  it("clears on null or a blank number", () => {
    expect(parsePhone(parser, null)).toBeNull();
    expect(
      parsePhone(parser, {
        country: "VN",
        number: "  ",
      }),
    ).toBeNull();
  });

  it("rejects a number invalid for its country", () => {
    expect(() =>
      parsePhone(parser, {
        country: "VN",
        number: "123",
      }),
    ).toThrow(InvalidPhoneError);
    expect(() =>
      parsePhone(parser, {
        country: "VN",
        number: "+1 415 555 2671",
      }),
    ).toThrow(InvalidPhoneError);
    expect(() =>
      parsePhone(parser, {
        country: "XX",
        number: "0901 234 567",
      }),
    ).toThrow(InvalidPhoneError);
  });
});
