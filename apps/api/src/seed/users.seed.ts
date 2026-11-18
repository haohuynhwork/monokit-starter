import { Logger } from "@nestjs/common";
import type { CommandBus } from "@nestjs/cqrs";
import { CreateUserCommand } from "../users/application/commands/create-user.command.js";
import { EmailTakenError } from "../users/domain/user.errors.js";
import type { UserRole } from "../users/domain/user.js";

const USERS: {
  email: string;
  displayName: string;
  role: UserRole;
}[] = [
  {
    email: "admin@example.com",
    displayName: "Admin",
    role: "admin",
  },
  {
    email: "editor@example.com",
    displayName: "Editor",
    role: "editor",
  },
  {
    email: "author@example.com",
    displayName: "Author",
    role: "author",
  },
];

// Idempotent: users that already exist (by email) are left alone
export async function seedUsers(
  commands: CommandBus,
  password: string,
): Promise<void> {
  const logger = new Logger("SeedUsers");
  for (const { email, displayName, role } of USERS) {
    try {
      await commands.execute(
        new CreateUserCommand(
          email,
          password,
          {
            displayName,
            shortName: null,
            givenName: null,
            familyName: null,
            phone: null,
          },
          role,
        ),
      );
      logger.log(`Created ${role} ${email}`);
    } catch (error) {
      if (!(error instanceof EmailTakenError)) {
        throw error;
      }
      logger.log(`Skipped ${email} (exists)`);
    }
  }
}
