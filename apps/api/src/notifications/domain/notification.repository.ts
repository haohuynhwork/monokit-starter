import type { NewNotification } from "./notification.js";

export interface StoredNotification extends NewNotification {
  id: bigint;
  createdAt: string;
}

export interface NotificationRepository {
  // One transaction for all of them
  createMany(rows: NewNotification[]): Promise<StoredNotification[]>;
  // Only the recipient's own; false when there was none to mark
  markRead(id: bigint, recipientId: bigint): Promise<boolean>;
  // Back to unread; false when there was none, or it already was unread
  markUnread(id: bigint, recipientId: bigint): Promise<boolean>;
  // Returns how many were unread
  markAllRead(recipientId: bigint): Promise<number>;
  // Only the recipient's own; null when there was none, else whether it was
  // still unread (the badge needs to know)
  delete(
    id: bigint,
    recipientId: bigint,
  ): Promise<{
    wasUnread: boolean;
  } | null>;
  // Removes the recipient's read ones; returns how many
  deleteRead(recipientId: bigint): Promise<number>;
}

export const NOTIFICATION_REPOSITORY = Symbol("NOTIFICATION_REPOSITORY");

// Pushes to the recipient's open tabs (WebSocket); best effort, the stored
// row is the source of truth
export interface RealtimePublisher {
  toUser(userId: bigint, event: string, payload: unknown): void;
}

export const REALTIME_PUBLISHER = Symbol("REALTIME_PUBLISHER");

// What toUser sent, for a subscriber
export interface RealtimeEvent {
  event: string;
  payload: unknown;
}

// The same pushes as a stream per user (GraphQL subscriptions); ends when
// the subscriber stops reading
export interface RealtimeStream {
  forUser(userId: bigint): AsyncIterableIterator<RealtimeEvent>;
}

export const REALTIME_STREAM = Symbol("REALTIME_STREAM");
