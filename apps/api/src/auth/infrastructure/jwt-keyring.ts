import { hkdfSync } from "node:crypto";

// 'ws': one-minute tickets that only open a realtime socket;
// 'password_reset': the link in a "forgot password" email
export type TokenType = "access" | "refresh" | "ws" | "password_reset";

export interface JwtKey {
  // In each token's header, so verify knows which secret signed it
  kid: string;
  // Derived per token type, so a refresh token can never pass as an
  // access token (or the reverse), even without the `typ` check
  keys: Record<TokenType, Buffer>;
}

// keys[0] signs; every key verifies. Rotate by moving JWT_SECRET to
// JWT_SECRET_PREVIOUS and setting a new JWT_SECRET; drop the previous one
// once the longest token (refresh, 30 days) has expired. After a leak,
// replace JWT_SECRET and leave JWT_SECRET_PREVIOUS unset.
export class JwtKeyring {
  private constructor(readonly keys: JwtKey[]) {}

  static fromEnv(env: NodeJS.ProcessEnv = process.env): JwtKeyring {
    const secrets = [
      env.JWT_SECRET,
      env.JWT_SECRET_PREVIOUS,
    ];
    if (!secrets[0]) {
      throw new Error("JWT_SECRET must be set");
    }
    const keys = secrets
      .filter((s): s is string => !!s)
      .map((secret, i) => {
        if (secret.length < 32) {
          const name = i === 0 ? "JWT_SECRET" : "JWT_SECRET_PREVIOUS";
          throw new Error(`${name} must be at least 32 characters`);
        }
        return toKey(secret);
      });
    return new JwtKeyring(keys);
  }

  get signing(): JwtKey {
    return this.keys[0]!;
  }

  find(kid: unknown): JwtKey | undefined {
    return this.keys.find((k) => k.kid === kid);
  }
}

const derive = (secret: string, info: string, length: number) =>
  Buffer.from(hkdfSync("sha256", secret, "", info, length));

function toKey(secret: string): JwtKey {
  return {
    // Reveals nothing about the secret, stable across restarts
    kid: derive(secret, "jwt-kid", 6).toString("base64url"),
    keys: {
      access: derive(secret, "jwt-access", 32),
      refresh: derive(secret, "jwt-refresh", 32),
      ws: derive(secret, "jwt-ws", 32),
      password_reset: derive(secret, "jwt-password-reset", 32),
    },
  };
}
