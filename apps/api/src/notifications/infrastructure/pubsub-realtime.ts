import { Injectable } from "@nestjs/common";
import { PubSub } from "graphql-subscriptions";
import type {
  RealtimeEvent,
  RealtimePublisher,
  RealtimeStream,
} from "../domain/notification.repository.js";

// In-process pub/sub for GraphQL subscriptions. Like the socket.io gateway,
// it only reaches sockets on this instance; with several api instances, swap
// PubSub for a shared one (e.g. graphql-redis-subscriptions on Valkey).
@Injectable()
export class PubSubRealtime implements RealtimePublisher, RealtimeStream {
  private readonly pubsub = new PubSub<Record<string, RealtimeEvent>>();

  toUser(userId: bigint, event: string, payload: unknown): void {
    void this.pubsub.publish(topic(userId), {
      event,
      payload,
    });
  }

  forUser(userId: bigint): AsyncIterableIterator<RealtimeEvent> {
    return this.pubsub.asyncIterableIterator(topic(userId));
  }
}

const topic = (userId: bigint) => `user:${userId}`;
