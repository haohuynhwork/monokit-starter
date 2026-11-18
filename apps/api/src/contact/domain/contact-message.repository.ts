import type {
  ContactMessageStatus,
  NewContactMessage,
} from "./contact-message.js";

export interface ContactMessageRepository {
  create(message: NewContactMessage): Promise<bigint>;
  markMailed(id: bigint): Promise<void>;
  // Non-deleted only; null when there is none
  findStatus(id: bigint): Promise<ContactMessageStatus | null>;
  // Non-deleted only; false when there was none
  changeStatus(id: bigint, status: ContactMessageStatus): Promise<boolean>;
  // Soft delete; false when there was none
  delete(id: bigint): Promise<boolean>;
}

export const CONTACT_MESSAGE_REPOSITORY = Symbol("CONTACT_MESSAGE_REPOSITORY");
