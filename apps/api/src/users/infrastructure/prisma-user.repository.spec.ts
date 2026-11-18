import type { Db } from "@packages/nest";
import type { AuditEntry } from "../../common/domain/audit-entry.js";
import type { AuditWriter } from "../../common/infrastructure/audit-writer.js";
import { Email } from "../domain/email.js";
import { User } from "../domain/user.js";
import { PrismaUserRepository } from "./prisma-user.repository.js";

// A db whose transaction keeps its writes only when the callback resolves,
// like a real rollback
function fakeDb() {
  const committed: string[] = [];
  const chain = (log: string[], model: string): unknown =>
    new Proxy(() => undefined, {
      get: (_, prop) =>
        prop === "then"
          ? undefined
          : (..._args: unknown[]) => {
              if (
                prop === "update" ||
                prop === "create" ||
                prop === "deleteAll"
              ) {
                log.push(`${model}.${String(prop)}`);
                return Promise.resolve({});
              }
              return chain(log, model);
            },
    });
  const db = {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const staged: string[] = [];
      const tx = {
        orm: {
          public: new Proxy(
            {},
            {
              get: (_, model) => chain(staged, String(model)),
            },
          ),
        },
      };
      const result = await fn(tx);
      committed.push(...staged);
      return result;
    },
  };
  return {
    db: db as unknown as Db,
    committed,
  };
}

function editor(): User {
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
    role: "editor",
  });
  user.assignId(5n);
  return user;
}

const entry: AuditEntry = {
  actor: {
    userId: 1n,
  },
  action: "users.role_changed",
  entity: {
    type: "user",
    id: "5",
  },
  data: {
    from: "editor",
    to: "author",
  },
};

describe("PrismaUserRepository.save with an audit entry", () => {
  it("writes the audit row in the same transaction", async () => {
    const { db, committed } = fakeDb();
    const audit = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const user = editor();
    user.changeRole("author", 1);
    await new PrismaUserRepository(db, audit).save(user, entry);
    expect(committed).toContain("User.update");
    expect(audit.record).toHaveBeenCalledWith(expect.anything(), entry);
  });

  it("rolls back the role change when the audit insert fails", async () => {
    const { db, committed } = fakeDb();
    const audit: AuditWriter = {
      record: vi.fn().mockRejectedValue(new Error("audit down")),
    };
    const user = editor();
    user.changeRole("author", 1);
    await expect(
      new PrismaUserRepository(db, audit).save(user, entry),
    ).rejects.toThrow("audit down");
    expect(committed).toEqual([]);
  });

  it("writes no audit row without an entry", async () => {
    const { db } = fakeDb();
    const audit = {
      record: vi.fn(),
    };
    await new PrismaUserRepository(db, audit).save(editor());
    expect(audit.record).not.toHaveBeenCalled();
  });
});
