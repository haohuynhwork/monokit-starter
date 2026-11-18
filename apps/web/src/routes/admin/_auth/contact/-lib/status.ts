import type { ContactMessageStatus } from "@/lib/types";

export const STATUS_LABEL: Record<ContactMessageStatus, string> = {
  new: "New",
  read: "Read",
  replied: "Replied",
  spam: "Spam",
  archived: "Archived",
};

export const STATUSES = Object.keys(STATUS_LABEL) as ContactMessageStatus[];
