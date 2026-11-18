import { InvalidContactMessageError } from "./contact.errors.js";

// Rules from ideas/contact/index.md

export const CONTACT_MESSAGE_STATUSES = [
  "new",
  "read",
  "replied",
  "spam",
  "archived",
] as const;
export type ContactMessageStatus = (typeof CONTACT_MESSAGE_STATUSES)[number];

// Visitors type plain text; staff adding one in the panel write HTML
export type ContactMessageFormat = "text" | "html";

// What the visitor filled in; the pages context has already checked it
// against the block (email or phone set, lengths, one-line subject)
export interface ContactMessageFields {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

export interface NewContactMessage {
  // For the mail subject only; not stored
  pageTitle: string;
  fields: ContactMessageFields;
  ip: string | null;
  userAgent: string | null;
  // 'text' unless noted (visitors)
  messageFormat?: ContactMessageFormat;
  status?: ContactMessageStatus;
}

// A message staff add by hand (a phone call, an email to someone): the
// same contact rule as the form (email or phone), lengths as stored
export function checkStaffMessage(
  fields: ContactMessageFields,
): ContactMessageFields {
  const clean = (v: string | undefined) => v?.trim() || undefined;
  const out: ContactMessageFields = {
    name: clean(fields.name),
    email: clean(fields.email)?.toLowerCase(),
    phone: clean(fields.phone),
    subject: clean(fields.subject),
    message: clean(fields.message),
  };
  if (!out.email && !out.phone) {
    throw new InvalidContactMessageError("An email or a phone is required");
  }
  if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) {
    throw new InvalidContactMessageError("That email address looks wrong");
  }
  const limits: [
    keyof ContactMessageFields,
    number,
  ][] = [
    [
      "name",
      255,
    ],
    [
      "email",
      320,
    ],
    [
      "phone",
      50,
    ],
    [
      "subject",
      255,
    ],
  ];
  for (const [field, max] of limits) {
    if ((out[field]?.length ?? 0) > max) {
      throw new InvalidContactMessageError(
        `${LABELS[field]} is at most ${max} characters`,
      );
    }
  }
  if (out.subject?.includes("\n")) {
    throw new InvalidContactMessageError("The subject is one line");
  }
  return out;
}

// Opening a message marks it read only while it is new; replied, spam and
// archived stay as they are
export function statusOnOpen(
  status: ContactMessageStatus,
): ContactMessageStatus {
  return status === "new" ? "read" : status;
}

const LABELS: Record<keyof ContactMessageFields, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  subject: "Subject",
  message: "Message",
};

// The notification mail to the site; plain text, the visitor's text as is
export function contactMail(m: NewContactMessage): {
  subject: string;
  text: string;
} {
  const { fields } = m;
  const lines = (Object.keys(LABELS) as (keyof ContactMessageFields)[])
    .filter((f) => fields[f])
    .map((f) => `${LABELS[f]}: ${fields[f]}`);
  return {
    subject: fields.subject
      ? `Contact: ${fields.subject}`
      : `Message from "${m.pageTitle}"${fields.name ? ` by ${fields.name}` : ""}`,
    text: lines.join("\n\n"),
  };
}
