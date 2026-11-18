import { createHash, createHmac, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Role } from "../../common/http/guards/auth.decorators.js";
import { InvalidTokenError } from "../domain/auth.errors.js";
import type {
  AccessClaims,
  RefreshToken,
  TokenService,
} from "../domain/tokens.js";
import { JwtKeyring, type TokenType } from "./jwt-keyring.js";

const ACCESS_TTL = 15 * 60;
const WS_TICKET_TTL = 60;
const PASSWORD_RESET_TTL = 60 * 60;

interface Payload {
  sub: string;
  typ: TokenType;
  role?: Role;
  // password_reset: passwordFingerprint at issue time
  pwf?: string;
  // access: the UserSession id
  sid?: string;
}

@Injectable()
export class JwtTokenService implements TokenService {
  private readonly keyring = JwtKeyring.fromEnv();

  constructor(private readonly jwt: JwtService) {}

  readonly accessTtl = ACCESS_TTL;

  issueAccess({ userId, role, sessionId }: AccessClaims): Promise<string> {
    return this.sign(
      {
        sub: String(userId),
        typ: "access",
        role,
        sid: String(sessionId),
      },
      ACCESS_TTL,
    );
  }

  async verifyAccess(token: string): Promise<AccessClaims> {
    const payload = await this.verify(token, "access");
    if (!payload.role || !/^\d+$/.test(payload.sid ?? "")) {
      throw new InvalidTokenError();
    }
    return {
      userId: BigInt(payload.sub),
      role: payload.role,
      sessionId: BigInt(payload.sid!),
    };
  }

  newRefreshToken(): RefreshToken {
    return this.refreshToken(randomBytes(32).toString("base64url"));
  }

  // Keyed with the signing key: without the secret, a stolen token's
  // successor can't be computed. After a JWT_SECRET rotation within the
  // grace window the successor differs, and the racing tab signs in again.
  nextRefreshToken(current: string): RefreshToken {
    const key = this.keyring.signing.keys.refresh;
    return this.refreshToken(
      createHmac("sha256", key).update(current).digest("base64url"),
    );
  }

  hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  issueWsTicket(userId: bigint, sessionId: bigint): Promise<string> {
    return this.sign(
      {
        sub: String(userId),
        typ: "ws",
        sid: String(sessionId),
      },
      WS_TICKET_TTL,
    );
  }

  async verifyWsTicket(ticket: string): Promise<{
    userId: bigint;
    sessionId: bigint;
  }> {
    const payload = await this.verify(ticket, "ws");
    if (!/^\d+$/.test(payload.sid ?? "")) {
      throw new InvalidTokenError();
    }
    return {
      userId: BigInt(payload.sub),
      sessionId: BigInt(payload.sid!),
    };
  }

  issuePasswordReset(userId: bigint, fingerprint: string): Promise<string> {
    return this.sign(
      {
        sub: String(userId),
        typ: "password_reset",
        pwf: fingerprint,
      },
      PASSWORD_RESET_TTL,
    );
  }

  async verifyPasswordReset(token: string): Promise<{
    userId: bigint;
    fingerprint: string;
  }> {
    const payload = await this.verify(token, "password_reset");
    if (typeof payload.pwf !== "string") {
      throw new InvalidTokenError();
    }
    return {
      userId: BigInt(payload.sub),
      fingerprint: payload.pwf,
    };
  }

  private sign(payload: Payload, expiresIn: number): Promise<string> {
    const { kid, keys } = this.keyring.signing;
    return this.jwt.signAsync(payload, {
      secret: keys[payload.typ],
      keyid: kid,
      algorithm: "HS256",
      expiresIn,
    });
  }

  private async verify(token: string, typ: TokenType): Promise<Payload> {
    // Pick the key by the header's kid: an unknown or retired kid fails
    const header = (
      this.jwt.decode(token, {
        complete: true,
      }) as {
        header?: {
          kid?: unknown;
        };
      } | null
    )?.header;
    const key = this.keyring.find(header?.kid);
    if (!key) {
      throw new InvalidTokenError();
    }

    let payload: Payload;
    try {
      // Algorithm pinned: rejects alg: none and anything unexpected; also
      // checks exp
      payload = await this.jwt.verifyAsync<Payload>(token, {
        secret: key.keys[typ],
        algorithms: [
          "HS256",
        ],
      });
    } catch {
      throw new InvalidTokenError();
    }
    // Kept although the per-type keys already separate them
    if (payload.typ !== typ || !/^\d+$/.test(payload.sub ?? "")) {
      throw new InvalidTokenError();
    }
    return payload;
  }

  private refreshToken(token: string): RefreshToken {
    return {
      token,
      hash: this.hashRefreshToken(token),
    };
  }
}
