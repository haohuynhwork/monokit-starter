import { Query } from "@nestjs/cqrs";

// One signed-in device; bigint ids go out as strings
export interface SessionView {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  // The device making the request
  current: boolean;
}

// The user's active sessions, most recently used first
export class ListSessionsQuery extends Query<SessionView[]> {
  constructor(
    readonly userId: bigint,
    readonly currentSessionId: bigint,
  ) {
    super();
  }
}
