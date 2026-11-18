import { Query } from "@nestjs/cqrs";
import type { ContactMessageDetail } from "./contact-message.view.js";

// Non-deleted only; null when there is none
export class GetContactMessageQuery extends Query<ContactMessageDetail | null> {
  constructor(readonly id: bigint) {
    super();
  }
}
