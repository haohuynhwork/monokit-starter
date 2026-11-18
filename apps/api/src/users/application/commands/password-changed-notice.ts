import type { Logger } from "@nestjs/common";
import type { CommandBus } from "@nestjs/cqrs";
import { SendEmailCommand } from "../../../mail/application/commands/send-email.command.js";
import type { User } from "../../domain/user.js";

// "Your password was changed", after a change or reset with `notify`. Not
// awaited: the caller's answer doesn't wait on the mail provider, and a
// failure is only logged (ideas/users/password-reset.md).
export function sendPasswordChangedNotice(
  commands: CommandBus,
  logger: Logger,
  user: User,
): void {
  const text = [
    `Hi ${user.greetingName},`,
    "",
    "The password of your account was just changed.",
    "",
    "If that wasn't you, reset it right away with “Forgot password?” on the",
    "sign-in page, and tell an administrator.",
  ].join("\n");
  commands
    .execute(
      new SendEmailCommand({
        to: user.email.value,
        subject: "Your password was changed",
        text,
      }),
    )
    .catch((error: unknown) =>
      logger.warn(
        `Password-changed notice for user ${user.id} not sent: ${String(error)}`,
      ),
    );
}
