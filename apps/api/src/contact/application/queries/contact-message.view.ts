import type {
  ContactMessageFormat,
  ContactMessageStatus,
} from "../../domain/contact-message.js";

// Response shape; bigint ids go out as strings
export interface ContactMessageView {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string | null;
  // 'html': sanitized HTML (added in the panel); 'text': as the visitor typed
  messageFormat: ContactMessageFormat;
  status: ContactMessageStatus;
  mailedAt: string | null;
  createdAt: string;
}

export interface ContactMessageDetail extends ContactMessageView {
  ip: string | null;
  userAgent: string | null;
}

export const CONTACT_MESSAGE_VIEW_FIELDS = [
  "id",
  "name",
  "email",
  "phone",
  "subject",
  "message",
  "messageFormat",
  "status",
  "mailedAt",
  "createdAt",
] as const;

export function toView<
  R extends {
    id: bigint;
  },
>(
  row: R,
): Omit<R, "id"> & {
  id: string;
} {
  return {
    ...row,
    id: String(row.id),
  };
}
