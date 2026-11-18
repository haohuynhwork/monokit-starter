import type { ResponseEnvelope } from "@packages/contracts";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { apiUrl } from "@/lib/site/public-api";

export type ContactState = {
  ok?: boolean;
  message?: string;
  // Under the input they belong to (name, email, phone, subject, message)
  fieldErrors?: Record<string, string>;
};

export const CONTACT_FIELDS = [
  "name",
  "email",
  "phone",
  "subject",
  "message",
] as const;

// Same limits as the api's contact block
export const LIMITS: Record<(typeof CONTACT_FIELDS)[number], number> = {
  name: 200,
  email: 255,
  phone: 50,
  subject: 255,
  message: 5000,
};

export type ContactInput = {
  pageId: string;
  blockId: string;
  fields: Record<string, string>;
  // Honeypot
  website: string;
};

// Checked before sending; only the fields the form shows are posted
export function checkContact(
  fields: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const value = (name: string) => fields[name]?.trim() ?? "";
  for (const name of CONTACT_FIELDS) {
    if (value(name).length > LIMITS[name]) {
      errors[name] = `Use at most ${LIMITS[name]} characters.`;
    }
  }
  if (
    !errors.email &&
    value("email") &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value("email"))
  ) {
    errors.email = "Enter a valid email address.";
  }
  if (!errors.subject && /[\r\n]/.test(fields.subject ?? "")) {
    errors.subject = "Use a single line.";
  }
  if ("message" in fields && !value("message")) {
    errors.message = "Enter a message.";
  }
  if (!value("email") && !value("phone")) {
    const message = "Leave an email or phone number.";
    if ("email" in fields) {
      errors.email ??= message;
    } else if ("phone" in fields) {
      errors.phone ??= message;
    }
  }
  return errors;
}

// The api's "<field> <reason>" contact errors and validation issues by field
function apiErrors(res: {
  message?: string | null;
  data?: unknown;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const fields = CONTACT_FIELDS as readonly string[];
  for (const i of (
    res.data as
      | {
          issues?: {
            path: string;
            message: string;
          }[];
        }
      | undefined
  )?.issues ?? []) {
    // fields.email -> email
    const name = i.path.split(".").find((p) => p !== "fields");
    if (name && fields.includes(name)) {
      errors[name] ??= i.message;
    }
  }
  const message = res.message ?? "";
  const [first = "", ...rest] = message.split(" ");
  if (fields.includes(first) && rest.length) {
    errors[first] ??=
      `${first[0]?.toUpperCase()}${first.slice(1)} ${rest.join(" ")}.`;
  } else if (message === "Leave an email or phone number") {
    errors.email ??= `${message}.`;
  }
  return errors;
}

// The api limits each visitor (5 messages per 10 minutes), by the address it
// sees: forward the visitor's
export const sendContact = createServerFn({
  method: "POST",
})
  .validator((input: ContactInput) => input)
  .handler(async ({ data }): Promise<ContactState> => {
    const invalid = checkContact(data.fields);
    if (Object.keys(invalid).length) {
      return {
        fieldErrors: invalid,
      };
    }
    const forwarded = getRequestHeader("x-forwarded-for");
    const agent = getRequestHeader("user-agent");
    try {
      const res = await fetch(apiUrl("/public/contact"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(forwarded
            ? {
                "x-forwarded-for": forwarded,
              }
            : {}),
          ...(agent
            ? {
                "user-agent": agent,
              }
            : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        return {
          ok: true,
        };
      }
      const body = (await res
        .json()
        .catch(() => null)) as ResponseEnvelope<unknown> | null;
      const fieldErrors = body ? apiErrors(body as never) : {};
      if (Object.keys(fieldErrors).length) {
        return {
          fieldErrors,
        };
      }
      return {
        message:
          (
            body as {
              message?: string;
            } | null
          )?.message ?? "Couldn't send your message.",
      };
    } catch {
      return {
        message: "Couldn't send your message.",
      };
    }
  });
