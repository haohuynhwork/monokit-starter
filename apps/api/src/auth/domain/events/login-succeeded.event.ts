import type { RequestMeta } from "../../../common/domain/actor.js";

// Raised after a sign-in started a session; audit records it
export class LoginSucceededEvent {
  constructor(
    readonly userId: bigint,
    // Login method, e.g. 'password'
    readonly provider: string,
    readonly meta?: RequestMeta,
  ) {}
}
