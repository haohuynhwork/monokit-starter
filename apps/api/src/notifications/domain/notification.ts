// Rules from ideas/notification/index.md. Rows store facts (type + data),
// not text; clients render them, so wording can change later.

// Each type and the data it carries; keep data small and free of secrets
export interface NotificationData {
  "post.published": {
    postId: string;
    title: string;
    path: string;
  };
  // total: minor units of currency
  "order.placed": {
    orderId: string;
    total: string;
    currency: string;
  };
  // Sent by an admin to themselves from the settings page
  test: Record<string, never>;
}

export type NotificationType = keyof NotificationData;

export interface NewNotification<
  T extends NotificationType = NotificationType,
> {
  recipientId: bigint;
  type: T;
  data: NotificationData[T];
  actorId: bigint | null;
}

// One notification per recipient, never to the person who caused it, and
// each recipient once
export function fanOut<T extends NotificationType>(
  recipients: bigint[],
  type: T,
  data: NotificationData[T],
  actorId: bigint | null,
): NewNotification<T>[] {
  return [
    ...new Set(recipients),
  ]
    .filter((id) => id !== actorId)
    .map((recipientId) => ({
      recipientId,
      type,
      data,
      actorId,
    }));
}

// A notification someone asked for themselves (the settings page's test):
// the one case where the recipient is also the cause, so no actor is
// recorded and fanOut's rule doesn't apply
export function toSelf<T extends NotificationType>(
  recipientId: bigint,
  type: T,
  data: NotificationData[T],
): NewNotification<T> {
  return {
    recipientId,
    type,
    data,
    actorId: null,
  };
}
