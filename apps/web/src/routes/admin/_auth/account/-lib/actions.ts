import { api } from "@/lib/api";

export type ChangePasswordState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Partial<
    Record<"currentPassword" | "newPassword" | "confirmPassword", string>
  >;
};

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "");

// The api's validation issues by their top-level field
function issueErrors(data: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const i of (
    data as
      | {
          issues?: {
            path: string;
            message: string;
          }[];
        }
      | undefined
  )?.issues ?? []) {
    errors[i.path.split(".")[0]] ??= i.message;
  }
  return errors;
}

export async function changePassword(
  formData: FormData,
): Promise<ChangePasswordState> {
  const currentPassword = field(formData, "currentPassword");
  const newPassword = field(formData, "newPassword");
  if (!currentPassword) {
    return {
      fieldErrors: {
        currentPassword: "Enter your current password",
      },
    };
  }
  if (newPassword.length < 8 || newPassword.length > 256) {
    return {
      fieldErrors: {
        newPassword: "Use 8 to 256 characters",
      },
    };
  }
  if (newPassword !== field(formData, "confirmPassword")) {
    return {
      fieldErrors: {
        confirmPassword: "Passwords do not match",
      },
    };
  }
  if (newPassword === currentPassword) {
    return {
      fieldErrors: {
        newPassword: "Choose a password you don't use now",
      },
    };
  }

  const res = await api("/users/me/password", {
    method: "PUT",
    body: {
      currentPassword,
      newPassword,
      // Mail "your password was changed"
      notify: true,
    },
  });
  if (res.status === "success") {
    return {
      ok: true,
      message: "Your password has been changed.",
    };
  }

  switch (res.code) {
    case "wrong_password":
      return {
        fieldErrors: {
          currentPassword: res.message ?? "Current password is wrong",
        },
      };
    case "weak_password":
      return {
        fieldErrors: {
          newPassword: res.message ?? "Password too weak",
        },
      };
    default: {
      const fieldErrors = issueErrors(res.data);
      if (Object.keys(fieldErrors).length) {
        return {
          fieldErrors,
        };
      }
      return {
        message: res.message ?? "Something went wrong.",
      };
    }
  }
}

export type AvatarState = {
  ok?: boolean;
  message?: string;
  // Under the file input
  fieldErrors?: {
    file?: string;
  };
};

// Callers run `router.invalidate()` after a success, which reloads the
// header's avatar too (the _auth layout fetches the user again)
export async function uploadAvatar(formData: FormData): Promise<AvatarState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      fieldErrors: {
        file: "Choose an image first.",
      },
    };
  }

  const body = new FormData();
  body.set("file", file, file.name);
  const res = await api("/users/me/avatar", {
    method: "PUT",
    body,
  });
  if (res.status !== "success") {
    // A bad file (type, size, unreadable image) is about the input
    return res.status === "fail"
      ? {
          fieldErrors: {
            file: res.message ?? "Upload failed.",
          },
        }
      : {
          message: res.message ?? "Upload failed.",
        };
  }
  return {
    ok: true,
    message: "Avatar updated.",
  };
}

export async function removeAvatar(): Promise<void> {
  await api("/users/me/avatar", {
    method: "DELETE",
  });
}

type ProfileField = "displayName" | "shortName" | "givenName" | "familyName";

export type ProfileState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Partial<Record<ProfileField, string>>;
};

// Same limits as the api's profile DTO
const PROFILE_LIMITS: Record<ProfileField, number> = {
  displayName: 255,
  shortName: 100,
  givenName: 255,
  familyName: 255,
};

// Callers run `router.invalidate()` after a success (the header's name)
export async function updateProfile(formData: FormData): Promise<ProfileState> {
  const values = {
    displayName: field(formData, "displayName"),
    shortName: field(formData, "shortName"),
    givenName: field(formData, "givenName"),
    familyName: field(formData, "familyName"),
  };
  const fieldErrors: Partial<Record<ProfileField, string>> = {};
  for (const [name, max] of Object.entries(PROFILE_LIMITS) as [
    ProfileField,
    number,
  ][]) {
    if (values[name].trim().length > max) {
      fieldErrors[name] = `Use at most ${max} characters`;
    }
  }
  const displayName = values.displayName.trim();
  if (!displayName) {
    fieldErrors.displayName = "Enter a display name";
  }
  if (Object.keys(fieldErrors).length) {
    return {
      fieldErrors,
    };
  }
  // Empty optional names are cleared
  const optional = (name: string) => field(formData, name).trim() || null;

  const res = await api("/users/me", {
    method: "PATCH",
    body: {
      displayName,
      shortName: optional("shortName"),
      givenName: optional("givenName"),
      familyName: optional("familyName"),
    },
  });
  if (res.status !== "success") {
    const issues = issueErrors(res.data);
    if (Object.keys(issues).length) {
      return {
        fieldErrors: issues,
      };
    }
    return {
      message: res.message ?? "Something went wrong.",
    };
  }
  return {
    ok: true,
    message: "Your profile has been updated.",
  };
}
