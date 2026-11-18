import type { CommandBus, QueryBus } from "@nestjs/cqrs";
import { ResetPasswordCommand } from "../../../users/application/commands/reset-password.command.js";
import {
  InvalidResetTokenError,
  InvalidTokenError,
} from "../../domain/auth.errors.js";
import type { TokenService } from "../../domain/tokens.js";
import { ResetPasswordWithTokenCommand } from "./reset-password-with-token.command.js";
import { ResetPasswordWithTokenHandler } from "./reset-password-with-token.handler.js";

const account = {
  userId: 7n,
  email: "a@b.c",
  name: "A",
  fingerprint: "fp1",
};

function handler(opts: {
  claims?: {
    userId: bigint;
    fingerprint: string;
  };
  account?: typeof account | null;
}) {
  const execute = vi.fn().mockResolvedValue(undefined);
  const tokens = {
    verifyPasswordReset: opts.claims
      ? vi.fn().mockResolvedValue(opts.claims)
      : vi.fn().mockRejectedValue(new InvalidTokenError()),
  } as unknown as TokenService;
  const queries = {
    execute: vi.fn().mockResolvedValue(opts.account ?? null),
  } as unknown as QueryBus;
  return {
    execute,
    run: () =>
      new ResetPasswordWithTokenHandler(
        {
          execute,
        } as unknown as CommandBus,
        queries,
        tokens,
      ).execute(new ResetPasswordWithTokenCommand("t", "new-password", true)),
  };
}

describe("ResetPasswordWithTokenHandler", () => {
  it("resets when the token matches the current password", async () => {
    const h = handler({
      claims: {
        userId: 7n,
        fingerprint: "fp1",
      },
      account,
    });
    await h.run();
    expect(h.execute).toHaveBeenCalledWith(
      new ResetPasswordCommand(7n, "new-password", true),
    );
  });

  it("refuses a link from before a password change", async () => {
    const h = handler({
      claims: {
        userId: 7n,
        fingerprint: "old",
      },
      account,
    });
    await expect(h.run()).rejects.toThrow(InvalidResetTokenError);
    expect(h.execute).not.toHaveBeenCalled();
  });

  it("refuses a bad token and an account that can no longer reset", async () => {
    await expect(
      handler({
        account,
      }).run(),
    ).rejects.toThrow(InvalidResetTokenError);
    await expect(
      handler({
        claims: {
          userId: 7n,
          fingerprint: "fp1",
        },
        account: null,
      }).run(),
    ).rejects.toThrow(InvalidResetTokenError);
  });
});
