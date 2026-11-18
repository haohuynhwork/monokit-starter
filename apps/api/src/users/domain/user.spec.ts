import { Email } from "./email.js";
import { passwordFingerprint } from "./password.js";
import { LastAdminError, UserDeletedError } from "./user.errors.js";
import { User } from "./user.js";

const profile = {
  displayName: "Paul",
  shortName: null,
  givenName: null,
  familyName: null,
  phone: null,
};

function admin(): User {
  const user = User.register({
    email: Email.parse("Paul@x.com"),
    profile,
    passwordHash: "hash",
    role: "admin",
  });
  user.assignId(1n);
  return user;
}

describe("User", () => {
  it("registers as an active author with a password identity", () => {
    const user = User.register({
      email: Email.parse(" anna@y.com "),
      profile,
      passwordHash: "hash",
    });
    expect(user.role).toBe("author");
    expect(user.canSignIn).toBe(true);
    expect(user.email.value).toBe("anna@y.com");
    expect(user.passwordHash).toBe("hash");
  });

  it("keeps the last active admin", () => {
    expect(() => admin().changeRole("editor", 1)).toThrow(LastAdminError);
    expect(() => admin().changeStatus("disabled", 1)).toThrow(LastAdminError);
    expect(() => admin().delete(1, "now")).toThrow(LastAdminError);
    expect(() => admin().changeRole("editor", 2)).not.toThrow();
  });

  it("scrubs personal data and logins on delete", () => {
    const user = admin();
    user.delete(2, "2026-10-31T00:00:00Z");
    const s = user.snapshot();
    expect(s.email.value).toBe("deleted-1@invalid");
    expect(s.displayName).toBe("Deleted user");
    expect(s.identities).toEqual([]);
    expect(user.canSignIn).toBe(false);
    expect(() =>
      user.updateProfile({
        displayName: "x",
      }),
    ).toThrow(UserDeletedError);
  });

  it("resets passwords only while active with a password identity", () => {
    const user = admin();
    expect(user.canResetPassword).toBe(true);
    user.changeStatus("disabled", 2);
    expect(user.canResetPassword).toBe(false);
    const gone = admin();
    gone.delete(2, "now");
    expect(gone.canResetPassword).toBe(false);
  });

  it("fingerprints a hash, changing with it", () => {
    expect(passwordFingerprint("hash")).toMatch(/^[0-9a-f]{16}$/);
    expect(passwordFingerprint("hash")).not.toBe(passwordFingerprint("hash2"));
  });
});
