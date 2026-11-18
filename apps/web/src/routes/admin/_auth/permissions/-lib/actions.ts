import { call } from "@/lib/admin/call";
import type { FormState } from "@/lib/api";

const CODE_FIELDS: Record<string, string> = {
  role_key_taken: "key",
  invalid_role_key: "key",
};

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "");

// Nothing is reloaded here; callers run `router.invalidate()` after a success
export async function saveRole(
  id: string | null,
  formData: FormData,
): Promise<FormState> {
  const name = field(formData, "name").trim();
  const key = field(formData, "key").trim();
  const fieldErrors: Record<string, string> = {};
  if (!name) {
    fieldErrors.name = "Enter a name.";
  }
  if (!id && (key.length < 2 || key.length > 50)) {
    fieldErrors.key = "Use 2 to 50 characters.";
  }
  if (Object.keys(fieldErrors).length) {
    return {
      fieldErrors,
    };
  }
  const body = {
    name,
    description: field(formData, "description").trim() || null,
    permissions: formData.getAll("permissions").map(String),
  };
  return call(
    id ? `/roles/${id}` : "/roles",
    {
      method: id ? "PATCH" : "POST",
      body: id
        ? body
        : {
            key,
            ...body,
          },
    },
    id ? "Role saved." : "Role created.",
    CODE_FIELDS,
  );
}

export async function deleteRole(id: string): Promise<FormState> {
  return call(
    `/roles/${id}`,
    {
      method: "DELETE",
    },
    "Role deleted.",
  );
}
