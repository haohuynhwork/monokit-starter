import type { Role } from "../../common/http/guards/auth.decorators.js";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  // Seconds until each token expires
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface AccessClaims {
  userId: bigint;
  role: Role;
  // The UserSession row: marks "this device", not checked per request
  sessionId: bigint;
}

// An opaque refresh token and the hash the session row stores
export interface RefreshToken {
  token: string;
  hash: string;
}

// Access tokens are stateless JWTs; refresh tokens are opaque and backed by
// a UserSession row (ideas/users/sessions.md)
export interface TokenService {
  // Seconds an access token lives
  readonly accessTtl: number;
  issueAccess(claims: AccessClaims): Promise<string>;
  // Throw InvalidTokenError on a bad signature, expiry or wrong type
  verifyAccess(token: string): Promise<AccessClaims>;
  // Random, for a new session
  newRefreshToken(): RefreshToken;
  // The token a rotation moves to. Derived from the current one, so a tab
  // that presents the token just rotated away from gets the same successor.
  nextRefreshToken(current: string): RefreshToken;
  hashRefreshToken(token: string): string;
  // A ticket that only opens a realtime socket (about a minute), so the
  // browser never holds an access token. Carries the device's session, so a
  // socket acts as that session (sign out on it ends this device).
  issueWsTicket(userId: bigint, sessionId: bigint): Promise<string>;
  verifyWsTicket(ticket: string): Promise<{
    userId: bigint;
    sessionId: bigint;
  }>;
  // The token in a reset link (an hour). `fingerprint` is the password's
  // at issue time; a changed password makes it stale.
  issuePasswordReset(userId: bigint, fingerprint: string): Promise<string>;
  verifyPasswordReset(token: string): Promise<{
    userId: bigint;
    fingerprint: string;
  }>;
}

export const TOKEN_SERVICE = Symbol("TOKEN_SERVICE");
