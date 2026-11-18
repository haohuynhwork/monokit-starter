import type { CommandBus } from "@nestjs/cqrs";
import { CreateUserCommand } from "../users/application/commands/create-user.command.js";
import { EmailTakenError } from "../users/domain/user.errors.js";
import { seedUsers } from "./users.seed.js";

describe("seedUsers", () => {
  it("creates each user and skips ones that exist", async () => {
    const execute = vi.fn(async (command: CreateUserCommand) => {
      if (command.email === "editor@example.com") {
        throw new EmailTakenError();
      }
      return 1n;
    });

    await seedUsers(
      {
        execute,
      } as unknown as CommandBus,
      "secret-password",
    );

    expect(execute).toHaveBeenCalledTimes(3);
    expect(
      execute.mock.calls.map(([c]) => [
        c.email,
        c.role,
      ]),
    ).toEqual([
      [
        "admin@example.com",
        "admin",
      ],
      [
        "editor@example.com",
        "editor",
      ],
      [
        "author@example.com",
        "author",
      ],
    ]);
  });

  it("rethrows other errors", async () => {
    const execute = vi.fn().mockRejectedValue(new Error("db down"));
    await expect(
      seedUsers(
        {
          execute,
        } as unknown as CommandBus,
        "secret-password",
      ),
    ).rejects.toThrow("db down");
  });
});
