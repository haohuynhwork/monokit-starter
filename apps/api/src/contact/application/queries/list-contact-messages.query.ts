import { Query } from "@nestjs/cqrs";
import type { ContactMessageStatus } from "../../domain/contact-message.js";
import type { ContactMessageView } from "./contact-message.view.js";

export interface ContactMessagePage {
  items: ContactMessageView[];
  total: number;
}

// Newest first; all statuses when `status` is null
export class ListContactMessagesQuery extends Query<ContactMessagePage> {
  constructor(
    readonly status: ContactMessageStatus | null,
    readonly limit: number,
    readonly offset: number,
  ) {
    super();
  }
}
