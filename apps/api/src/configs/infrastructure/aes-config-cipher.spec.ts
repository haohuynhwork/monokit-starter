import { describe, expect, it } from "vitest";
import { AesConfigCipher } from "./aes-config-cipher.js";

const A = "a".repeat(32);
const B = "b".repeat(32);
const value = {
  host: "smtp.example.com",
  password: "hunter2",
};

describe("AesConfigCipher", () => {
  it("opens what it sealed, without the plain text in the output", () => {
    const c = AesConfigCipher.fromEnv({
      APP_SECRET: A,
    });
    const sealed = c.seal("mail", value);
    expect(sealed).not.toContain("hunter2");
    expect(c.open("mail", sealed)).toEqual(value);
    expect(c.isStale(sealed)).toBe(false);
  });

  it("refuses a value moved to another key", () => {
    const c = AesConfigCipher.fromEnv({
      APP_SECRET: A,
    });
    expect(() => c.open("other.key", c.seal("mail", value))).toThrow();
  });

  it("opens values from the previous secret and marks them stale", () => {
    const old = AesConfigCipher.fromEnv({
      APP_SECRET: A,
    });
    const sealed = old.seal("mail", value);
    const rotated = AesConfigCipher.fromEnv({
      APP_SECRET: B,
      APP_SECRET_PREVIOUS: A,
    });
    expect(rotated.open("mail", sealed)).toEqual(value);
    expect(rotated.isStale(sealed)).toBe(true);
    expect(rotated.isStale(rotated.seal("mail", value))).toBe(false);
  });

  it("can't open values once the previous secret is gone", () => {
    const sealed = AesConfigCipher.fromEnv({
      APP_SECRET: A,
    }).seal("mail", value);
    const c = AesConfigCipher.fromEnv({
      APP_SECRET: B,
    });
    expect(() => c.open("mail", sealed)).toThrow(/secret/);
  });

  it("checks the secrets", () => {
    expect(AesConfigCipher.fromEnv({}).available).toBe(false);
    expect(() =>
      AesConfigCipher.fromEnv({
        APP_SECRET: "short",
      }),
    ).toThrow();
    expect(() =>
      AesConfigCipher.fromEnv({
        APP_SECRET_PREVIOUS: A,
      }),
    ).toThrow();
  });
});
