import { describe, expect, it } from "vitest";
import { Address, type AddressFields, type AddressRules } from "./address.js";

const rules = (allowedCountries: string[] | null = null): AddressRules => ({
  allowedCountries,
  isCountry: (c) =>
    [
      "VN",
      "US",
    ].includes(c),
  regionName: (code, country) =>
    ({
      VN: {
        "VN-HN": "Hà Nội",
      },
      US: {
        "US-CA": "California",
      },
    })[country as "VN" | "US"]?.[code as never],
});

const fields: AddressFields = {
  label: null,
  recipientName: "An",
  phone: "1",
  line1: "x",
  line2: null,
  city: "Hanoi",
  regionCode: "vn-hn",
  region: "typed",
  postalCode: null,
  countryCode: "vn",
};

describe("Address", () => {
  it("fills region from regionCode", () => {
    const a = Address.create(1n, fields, true, rules());
    expect(a.snapshot()).toMatchObject({
      countryCode: "VN",
      regionCode: "VN-HN",
      region: "Hà Nội",
    });
  });

  it("refuses a region of another country", () => {
    expect(() =>
      Address.create(
        1n,
        {
          ...fields,
          regionCode: "US-CA",
        },
        true,
        rules(),
      ),
    ).toThrow(/not available in VN/);
  });

  it("keeps a typed region without a code", () => {
    const a = Address.create(
      1n,
      {
        ...fields,
        regionCode: null,
      },
      true,
      rules(),
    );
    expect(a.snapshot().region).toBe("typed");
  });

  it("refuses countries the shop does not ship to", () => {
    expect(() =>
      Address.create(
        1n,
        fields,
        true,
        rules([
          "US",
        ]),
      ),
    ).toThrow(
      expect.objectContaining({
        code: "country_not_shipped",
      }),
    );
  });

  it("drops the old region when the country changes", () => {
    const a = Address.create(1n, fields, true, rules());
    a.update(
      {
        countryCode: "US",
      },
      rules(),
    );
    expect(a.snapshot()).toMatchObject({
      regionCode: null,
      region: null,
    });
  });
});
