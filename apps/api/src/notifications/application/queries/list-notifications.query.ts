import { Query } from "@nestjs/cqrs";
import type { NotificationView } from "./notification.view.js";

export interface NotificationPage {
  items: NotificationView[];
  unread: number;
  // Pass as `before` for the next page; null at the end
  nextCursor: string | null;
}

// The recipient's notifications, newest first
export class ListNotificationsQuery extends Query<NotificationPage> {
  constructor(
    readonly userId: bigint,
    readonly limit: number,
    // Only older than this notification id
    readonly before: bigint | null,
  ) {
    super();
  }
}
