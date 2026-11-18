import type { Session } from "./session.js";

export interface SessionRepository {
  findById(id: bigint): Promise<Session | null>;
  // Matches the current or the previous token hash
  findByTokenHash(hash: string): Promise<Session | null>;
  save(session: Session): Promise<void>;
  // Sign out everywhere: every active session of the user
  revokeAllForUser(userId: bigint, now: Date): Promise<void>;
}

export const SESSION_REPOSITORY = Symbol("SESSION_REPOSITORY");
