import { describe, expect, it } from "vitest";
import { Currency, checkRate } from "./currency.js";

const now = new Date("2026-11-01T00:00:00Z");
const later = new Date("2026-11-02T00:00:00Z");

describe("Currency", () => {
  it("normalises the rate", () => {
    expect(checkRate("0025450.500")).toBe("25450.5");
    expect(checkRate("1.0")).toBe("1");
    expect(() => checkRate("0")).toThrow(/above 0/);
    expect(() => checkRate("-1")).toThrow();
    expect(() => checkRate("1.12345678901")).toThrow();
  });

  it("keeps the base rate at 1 and the base active", () => {
    expect(() =>
      Currency.create(
        {
          code: "usd",
          name: "Dollar",
          rate: "2",
        },
        "USD",
        now,
      ),
    ).toThrow(/base currency/);
    const usd = Currency.create(
      {
        code: "usd",
        name: "Dollar",
        rate: "1",
      },
      "USD",
      now,
    );
    expect(usd.snapshot().code).toBe("USD");
    expect(() =>
      usd.update(
        {
          rate: "3",
        },
        "USD",
        now,
      ),
    ).toThrow(/base/);
    expect(() =>
      usd.update(
        {
          active: false,
        },
        "USD",
        now,
      ),
    ).toThrow(/base/);
    expect(() => usd.checkDeletable("USD")).toThrow(/base/);
  });

  it("stamps rateAt only when the rate changes", () => {
    const vnd = Currency.create(
      {
        code: "VND",
        name: "Dong",
        decimals: 0,
        rate: "25450",
      },
      "USD",
      now,
    );
    vnd.update(
      {
        rate: "25450.0",
      },
      "USD",
      later,
    );
    expect(vnd.snapshot().rateAt).toBe(now.toISOString());
    vnd.update(
      {
        rate: "26000",
      },
      "USD",
      later,
    );
    expect(vnd.snapshot()).toMatchObject({
      rate: "26000",
      rateAt: later.toISOString(),
    });
  });

  it("refuses bad codes and decimals", () => {
    expect(() =>
      Currency.create(
        {
          code: "US",
          name: "x",
          rate: "1",
        },
        "USD",
        now,
      ),
    ).toThrow(/3 letters/);
    expect(() =>
      Currency.create(
        {
          code: "EUR",
          name: "x",
          rate: "1",
          decimals: 5,
        },
        "USD",
        now,
      ),
    ).toThrow(/0 to 4/);
  });
});
