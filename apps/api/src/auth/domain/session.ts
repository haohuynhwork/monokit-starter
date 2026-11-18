import { InvalidTokenError } from "./auth.errors.js";

// A signed-in device (ideas/users/sessions.md, option A). The refresh token
// is opaque and only its hash is kept. Each refresh rotates it; the token
// before the last rotation is remembered, to tell a racing tab (grace) from
// a stolen copy (reuse).

// Sliding: every refresh pushes expiry out again
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Two tabs refreshing at once must not look like reuse
export const REFRESH_GRACE_MS = 30 * 1000;

// What a refresh did: 'rotated' moved to the next token; 'grace' let a tab
// that lost the race present the token just rotated away from (it gets the
// same successor); 'reuse' saw an older copy, so someone else holds the
// token and the session is now revoked.
export type RefreshOutcome = "rotated" | "grace" | "reuse";

export interface Device {
  userAgent: string | null;
  ip: string | null;
}

export interface SessionProps extends Device {
  id: bigint | null;
  userId: bigint;
  tokenHash: string;
  previousTokenHash: string | null;
  // ISO timestamps
  rotatedAt: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export class Session {
  private constructor(private props: SessionProps) {}

  static start(
    userId: bigint,
    tokenHash: string,
    device: Device,
    now: Date,
  ): Session {
    const at = now.toISOString();
    return new Session({
      id: null,
      userId,
      tokenHash,
      previousTokenHash: null,
      rotatedAt: null,
      userAgent: device.userAgent?.slice(0, 512) ?? null,
      ip: device.ip?.slice(0, 45) ?? null,
      createdAt: at,
      lastUsedAt: at,
      expiresAt: expiry(now),
      revokedAt: null,
    });
  }

  static restore(props: SessionProps): Session {
    return new Session({
      ...props,
    });
  }

  get id(): bigint | null {
    return this.props.id;
  }

  get userId(): bigint {
    return this.props.userId;
  }

  get isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  assignId(id: bigint): void {
    this.props.id = id;
  }

  // `nextHash` is the hash of the presented token's successor; successors
  // are derived from the token, so a racing tab computes the same one.
  // Throws InvalidTokenError when the session can't refresh at all.
  refresh(presentedHash: string, nextHash: string, now: Date): RefreshOutcome {
    if (this.isRevoked || Date.parse(this.props.expiresAt) <= now.getTime()) {
      throw new InvalidTokenError();
    }
    if (presentedHash === this.props.tokenHash) {
      this.props.previousTokenHash = this.props.tokenHash;
      this.props.tokenHash = nextHash;
      this.props.rotatedAt = now.toISOString();
      this.touch(now);
      return "rotated";
    }
    if (presentedHash !== this.props.previousTokenHash) {
      // Not this session's token at all
      throw new InvalidTokenError();
    }
    const sinceRotation = now.getTime() - Date.parse(this.props.rotatedAt!);
    if (
      sinceRotation <= REFRESH_GRACE_MS &&
      nextHash === this.props.tokenHash
    ) {
      this.touch(now);
      return "grace";
    }
    this.revoke(now);
    return "reuse";
  }

  touch(now: Date): void {
    this.props.lastUsedAt = now.toISOString();
    this.props.expiresAt = expiry(now);
  }

  revoke(now: Date): void {
    this.props.revokedAt ??= now.toISOString();
  }

  isOwnedBy(userId: bigint): boolean {
    return this.props.userId === userId;
  }

  snapshot(): Readonly<SessionProps> {
    return {
      ...this.props,
    };
  }
}

const expiry = (now: Date) =>
  new Date(now.getTime() + SESSION_TTL_MS).toISOString();
