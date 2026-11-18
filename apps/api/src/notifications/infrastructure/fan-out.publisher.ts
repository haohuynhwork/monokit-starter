import type { RealtimePublisher } from "../domain/notification.repository.js";

// One push to every transport: the socket.io gateway and GraphQL
// subscriptions. Best effort each; one failing doesn't stop the other.
export class FanOutPublisher implements RealtimePublisher {
  constructor(private readonly targets: RealtimePublisher[]) {}

  toUser(userId: bigint, event: string, payload: unknown): void {
    for (const target of this.targets) {
      try {
        target.toUser(userId, event, payload);
      } catch {
        // The stored row is the source of truth
      }
    }
  }
}
