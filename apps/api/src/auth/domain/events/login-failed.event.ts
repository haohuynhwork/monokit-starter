import type { RequestMeta } from "../../../common/domain/actor.js";

// Raised when a sign-in is refused. Carries no email, so the audit log can't
// be used to collect addresses (ideas/audit/index.md, Privacy).
export class LoginFailedEvent {
  constructor(
    readonly reason: "invalid_credentials",
    readonly meta?: RequestMeta,
  ) {}
}
