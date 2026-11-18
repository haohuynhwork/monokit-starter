import { api } from "@/lib/api";

// The api's NotificationView / NotificationPage
export type Notification = {
  id: string;
  actor: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  read: boolean;
} & (
  | {
      type: "post.published";
      data: {
        postId: string;
        title: string;
        path: string;
      };
    }
  | {
      // Sent by an admin to themselves (settings page)
      type: "test";
      data: Record<string, never>;
    }
  | {
      type: "order.placed";
      // total: minor units of currency
      data: {
        orderId: string;
        total: string;
        currency: string;
      };
    }
);

export type NotificationPage = {
  items: Notification[];
  unread: number;
  nextCursor: string | null;
};

export async function listNotifications(
  before?: string,
): Promise<NotificationPage | null> {
  const query = new URLSearchParams({
    limit: "10",
  });
  if (before) {
    query.set("before", before);
  }
  const res = await api<NotificationPage>(`/notifications?${query}`);
  return res.status === "success" && res.data ? res.data : null;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api(`/notifications/${id}/read`, {
    method: "POST",
  });
}

export async function markNotificationUnread(id: string): Promise<void> {
  await api(`/notifications/${id}/unread`, {
    method: "POST",
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await api("/notifications/read-all", {
    method: "POST",
  });
}

// A one-minute ticket for the realtime socket (the access token stays in
// its HttpOnly cookie)
export async function getRealtimeTicket(): Promise<string | null> {
  const res = await api<{
    ticket: string;
  }>("/auth/ws-ticket", {
    method: "POST",
  });
  return res.status === "success" && res.data ? res.data.ticket : null;
}

export async function deleteNotification(id: string): Promise<void> {
  await api(`/notifications/${id}`, {
    method: "DELETE",
  });
}

// Removes the read ones; unread stay
export async function clearReadNotifications(): Promise<void> {
  await api("/notifications/read", {
    method: "DELETE",
  });
}
