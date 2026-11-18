import { Email } from "../../domain/email.js";
import { User } from "../../domain/user.js";
import type { UserRepository } from "../../domain/user.repository.js";
import { ChangeUserRoleCommand } from "./change-user-role.command.js";
import { ChangeUserRoleHandler } from "./change-user-role.handler.js";

function repo(user: User) {
  return {
    findById: vi.fn().mockResolvedValue(user),
    findByEmail: vi.fn(),
    countActiveAdmins: vi.fn().mockResolvedValue(2),
    save: vi.fn().mockResolvedValue(undefined),
  } satisfies UserRepository;
}

function author(): User {
  const user = User.register({
    email: Email.parse("a@b.c"),
    profile: {
      displayName: "Anna",
      shortName: null,
      givenName: null,
      familyName: null,
      phone: null,
    },
    passwordHash: "hash",
  });
  user.assignId(5n);
  return user;
}

const actor = {
  userId: 1n,
  ip: "10.0.0.1",
  userAgent: "test",
};

describe("ChangeUserRoleHandler", () => {
  it("saves the change with its guaranteed audit entry", async () => {
    const users = repo(author());
    await new ChangeUserRoleHandler(users).execute(
      new ChangeUserRoleCommand(5n, "editor", actor),
    );
    expect(users.save).toHaveBeenCalledWith(expect.any(User), {
      actor,
      action: "users.role_changed",
      entity: {
        type: "user",
        id: "5",
      },
      data: {
        from: "author",
        to: "editor",
      },
    });
  });

  it("records nothing when the role stays the same", async () => {
    const users = repo(author());
    await new ChangeUserRoleHandler(users).execute(
      new ChangeUserRoleCommand(5n, "author", actor),
    );
    expect(users.save).toHaveBeenCalledWith(expect.any(User), undefined);
  });

  it("fails when the audit row can't be written", async () => {
    const users = repo(author());
    users.save.mockRejectedValue(new Error("audit down"));
    await expect(
      new ChangeUserRoleHandler(users).execute(
        new ChangeUserRoleCommand(5n, "editor", actor),
      ),
    ).rejects.toThrow("audit down");
  });
});
