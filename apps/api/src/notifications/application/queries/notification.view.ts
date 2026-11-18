import type {
  NotificationData,
  NotificationType,
} from "../../domain/notification.js";

// One notification for its recipient; ids as strings
export interface NotificationView {
  id: string;
  type: NotificationType;
  data: NotificationData[NotificationType];
  actor: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  read: boolean;
}
