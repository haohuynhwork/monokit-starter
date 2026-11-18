import { describe, expect, it } from "vitest";
import { maskSecrets, parseConfig } from "./config.js";

const smtp = {
  driver: "smtp",
  host: " smtp.example.com ",
  port: 587,
  secure: false,
  username: "mailer",
  password: "hunter2",
  fromName: "My CMS",
  fromEmail: "no-reply@example.com",
};
const resend = {
  driver: "resend",
  apiKey: "re_123",
  fromName: "",
  fromEmail: "no-reply@example.com",
};

describe("mail", () => {
  it("accepts each driver, keeping only its fields", () => {
    expect(parseConfig("mail", smtp).value).toMatchObject({
      driver: "smtp",
      host: "smtp.example.com",
      password: "hunter2",
    });
    expect(
      parseConfig("mail", {
        ...resend,
        host: "x",
      }).value,
    ).toEqual(resend);
    expect(
      parseConfig("mail", {
        driver: "log",
        fromEmail: "a@example.com",
      }).value,
    ).toEqual({
      driver: "log",
      fromName: "",
      fromEmail: "a@example.com",
    });
  });

  it("keeps the stored secret when the new one is empty", () => {
    const current = parseConfig("mail", smtp).value;
    const next = parseConfig(
      "mail",
      {
        ...smtp,
        host: "smtp2.example.com",
        password: "",
      },
      current,
    ).value;
    expect(next).toMatchObject({
      host: "smtp2.example.com",
      password: "hunter2",
    });
  });

  it("doesn't carry a secret over to another driver", () => {
    const current = parseConfig("mail", smtp).value;
    const next = parseConfig(
      "mail",
      {
        ...resend,
        apiKey: "",
      },
      current,
    ).value;
    expect(next).toMatchObject({
      driver: "resend",
      apiKey: "",
    });
  });

  it("refuses bad fields and unknown drivers", () => {
    expect(() =>
      parseConfig("mail", {
        ...smtp,
        port: 0,
      }),
    ).toThrow(/port/);
    expect(() =>
      parseConfig("mail", {
        ...smtp,
        fromEmail: "nope",
      }),
    ).toThrow(/fromEmail/);
    expect(() =>
      parseConfig("mail", {
        ...smtp,
        driver: "pigeon",
      }),
    ).toThrow(/driver/);
  });

  it("never shows secrets", () => {
    const { value, secretsSet } = maskSecrets("mail", smtp);
    expect(value).toMatchObject({
      password: "",
    });
    expect(value).not.toHaveProperty("apiKey");
    expect(secretsSet).toEqual([
      "password",
    ]);
  });
});
