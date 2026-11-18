import type { RequestMeta } from "../../../common/domain/actor.js";

// Raised after a setting is saved; audit records it (key only, never the
// value: some settings are secrets)
export class ConfigUpdatedEvent {
  constructor(
    readonly key: string,
    readonly actorId: bigint,
    // Request context, for audit
    readonly meta?: RequestMeta,
  ) {}
}
