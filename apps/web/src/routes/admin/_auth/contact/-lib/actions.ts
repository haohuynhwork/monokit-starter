import { api } from "@/lib/api";
import type { ContactMessageStatus } from "@/lib/types";

export type ContactActionState = {
  ok?: boolean;
  message?: string;
};

// Callers run `router.invalidate()` (or navigate) after a success
async function call(
  path: string,
  init: {
    method: string;
    body?: unknown;
  },
  done: string,
): Promise<ContactActionState> {
  const res = await api(path, init);
  if (res.status !== "success") {
    return {
      message: res.message ?? "Something went wrong.",
    };
  }
  return {
    ok: true,
    message: done,
  };
}

export async function setMessageStatus(
  id: string,
  status: ContactMessageStatus,
): Promise<ContactActionState> {
  return call(
    `/contact/messages/${id}`,
    {
      method: "PATCH",
      body: {
        status,
      },
    },
    "Message updated.",
  );
}

// Opened in the panel: new becomes read
export async function openMessage(id: string): Promise<ContactActionState> {
  return call(
    `/contact/messages/${id}/open`,
    {
      method: "POST",
    },
    "",
  );
}

export async function deleteMessage(id: string): Promise<ContactActionState> {
  return call(
    `/contact/messages/${id}`,
    {
      method: "DELETE",
    },
    "Message deleted.",
  );
}

export type CreateMessageState = {
  message?: string;
  // The new message's id once saved; the form then opens it
  id?: string;
};

// A message added by hand (a call, an email)
export async function createMessage(
  formData: FormData,
): Promise<CreateMessageState> {
  const value = (k: string) => String(formData.get(k) ?? "");
  const optional = (k: string) => value(k).trim() || undefined;
  const res = await api<{
    id: string;
  }>("/contact/messages", {
    method: "POST",
    body: {
      name: optional("name"),
      email: optional("email"),
      phone: optional("phone"),
      subject: optional("subject"),
      message: optional("message"),
      status: value("status") || "read",
    },
  });
  if (res.status !== "success" || !res.data) {
    const issues = (
      res.data as
        | {
            issues?: {
              message: string;
            }[];
          }
        | undefined
    )?.issues;
    return {
      message: issues?.[0]?.message ?? res.message ?? "Couldn't save it.",
    };
  }
  return {
    id: res.data.id,
  };
}
