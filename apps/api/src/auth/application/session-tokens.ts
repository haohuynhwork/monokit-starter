import type { Role } from "../../common/http/guards/auth.decorators.js";
import { SESSION_TTL_MS } from "../domain/session.js";
import type { TokenPair, TokenService } from "../domain/tokens.js";

// The pair handed to the client for a session and its current refresh token
export async function sessionTokens(
  tokens: TokenService,
  claims: {
    userId: bigint;
    role: Role;
    sessionId: bigint;
  },
  refreshToken: string,
): Promise<TokenPair> {
  return {
    accessToken: await tokens.issueAccess(claims),
    refreshToken,
    expiresIn: tokens.accessTtl,
    refreshExpiresIn: SESSION_TTL_MS / 1000,
  };
}
