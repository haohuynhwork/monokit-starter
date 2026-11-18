import type { RequestMeta } from "../../../common/domain/actor.js";

// Raised when a post goes live now (not when scheduled for later). Other
// contexts react through the EventBus, e.g. notifications.
export class PostPublishedEvent {
  constructor(
    readonly postId: bigint,
    readonly title: string,
    // Its public path, e.g. 'travel/paris'
    readonly path: string,
    readonly actorId: bigint,
    // Request context, for audit
    readonly meta?: RequestMeta,
  ) {}
}
