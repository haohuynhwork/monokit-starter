import { InvalidContactMessageError } from "./contact.errors.js";
import {
  checkStaffMessage,
  contactMail,
  statusOnOpen,
} from "./contact-message.js";

const base = {
  pageTitle: "Contact",
  ip: null,
  userAgent: null,
};

describe("contact messages", () => {
  it("marks only new messages read on open", () => {
    expect(statusOnOpen("new")).toBe("read");
    expect(statusOnOpen("replied")).toBe("replied");
    expect(statusOnOpen("spam")).toBe("spam");
  });

  it("uses the subject for the mail, else the page title", () => {
    expect(
      contactMail({
        ...base,
        fields: {
          email: "a@b.co",
          subject: "Quote",
        },
      }).subject,
    ).toBe("Contact: Quote");
    const mail = contactMail({
      ...base,
      fields: {
        name: "An",
        email: "a@b.co",
        message: "Hi",
      },
    });
    expect(mail.subject).toBe('Message from "Contact" by An');
    expect(mail.text).toBe("Name: An\n\nEmail: a@b.co\n\nMessage: Hi");
  });
});

describe("checkStaffMessage", () => {
  it("needs an email or a phone and trims what it keeps", () => {
    expect(
      checkStaffMessage({
        name: " Ann ",
        email: " A@X.io ",
        message: " <p>Hi</p> ",
      }),
    ).toEqual({
      name: "Ann",
      email: "a@x.io",
      phone: undefined,
      subject: undefined,
      message: "<p>Hi</p>",
    });
    expect(() =>
      checkStaffMessage({
        name: "Ann",
      }),
    ).toThrow(InvalidContactMessageError);
    expect(() =>
      checkStaffMessage({
        email: "nope",
      }),
    ).toThrow(InvalidContactMessageError);
    expect(() =>
      checkStaffMessage({
        phone: "1",
        subject: "two\nlines",
      }),
    ).toThrow(InvalidContactMessageError);
  });
});
