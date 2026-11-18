// Who performs a command, for audit: the signed-in user (null for the system
// or an anonymous caller) plus the request context. Free of HTTP types so
// commands and domain events can carry it.

// Request context of an action, when there was a request
export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface Actor extends RequestMeta {
  userId: bigint | null;
}

// Seeders, scripts and scheduled jobs
export const SYSTEM_ACTOR: Actor = Object.freeze({
  userId: null,
});

export function metaOf(actor: Actor): RequestMeta {
  return {
    ip: actor.ip,
    userAgent: actor.userAgent,
  };
}
