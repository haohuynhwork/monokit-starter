import { call as apiCall } from "@/lib/admin/call";
import type { FormState } from "@/lib/api";

export type UserActionState = FormState;

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "");

const CODE_FIELDS: Record<string, string> = {
  email_taken: "email",
  invalid_email: "email",
  weak_password: "password",
};

// Checked before the request; the api checks the same rules
function checkName(
  fieldErrors: Record<string, string>,
  displayName: string,
  shortName: string,
) {
  const n = displayName.trim().length;
  if (n === 0) {
    fieldErrors.displayName = "Enter a name.";
  } else if (n > 255) {
    fieldErrors.displayName = "Use at most 255 characters.";
  }
  if (shortName.trim().length > 100) {
    fieldErrors.shortName = "Use at most 100 characters.";
  }
}

// Admin-only endpoints; the api checks the role and its rules (e.g. the last
// active admin can't be demoted, disabled or deleted). Nothing is reloaded
// here; callers run `router.invalidate()` after a success.
async function call(
  path: string,
  init: {
    method: string;
    body?: unknown;
  },
  done: string,
): Promise<UserActionState> {
  const res = await apiCall(path, init, done, CODE_FIELDS);
  return res.ok
    ? {
        ok: true,
        message: done,
      }
    : res.fieldErrors
      ? {
          fieldErrors: res.fieldErrors,
        }
      : {
          message: res.message ?? "Something went wrong.",
        };
}

export async function createUser(formData: FormData): Promise<UserActionState> {
  const fieldErrors: Record<string, string> = {};
  checkName(fieldErrors, field(formData, "displayName"), "");
  const email = field(formData, "email").trim();
  if (!email) {
    fieldErrors.email = "Enter an email.";
  } else if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Enter a valid email, e.g. name@example.com.";
  }
  const password = field(formData, "password");
  if (password.length < 8 || password.length > 256) {
    fieldErrors.password = "Use 8 to 256 characters.";
  }
  if (Object.keys(fieldErrors).length) {
    return {
      fieldErrors,
    };
  }
  return call(
    "/users",
    {
      method: "POST",
      body: {
        displayName: field(formData, "displayName"),
        email,
        password: field(formData, "password"),
        role: field(formData, "role") || "author",
      },
    },
    "User created.",
  );
}

export async function renameUser(formData: FormData): Promise<UserActionState> {
  const shortName = field(formData, "shortName").trim();
  const fieldErrors: Record<string, string> = {};
  checkName(fieldErrors, field(formData, "displayName"), shortName);
  if (Object.keys(fieldErrors).length) {
    return {
      fieldErrors,
    };
  }
  return call(
    `/users/${field(formData, "id")}`,
    {
      method: "PATCH",
      body: {
        displayName: field(formData, "displayName"),
        shortName: shortName || null,
      },
    },
    "Saved.",
  );
}

export async function changeRole(
  id: string,
  role: string,
): Promise<UserActionState> {
  return call(
    `/users/${id}/role`,
    {
      method: "PUT",
      body: {
        role,
      },
    },
    "Role changed.",
  );
}

export async function setStatus(
  id: string,
  status: "active" | "disabled",
): Promise<UserActionState> {
  return call(
    `/users/${id}/status`,
    {
      method: "PUT",
      body: {
        status,
      },
    },
    status === "active" ? "User enabled." : "User disabled.",
  );
}

export async function deleteUser(id: string): Promise<UserActionState> {
  return call(
    `/users/${id}`,
    {
      method: "DELETE",
    },
    "User deleted.",
  );
}
