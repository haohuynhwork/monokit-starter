import { api, type FormState, toFormState } from "@/lib/api";

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "").trim();

// Create when there's no id, else update. Checks the form first so most
// errors show without a round trip; the api validates again.
export async function saveCategory(formData: FormData): Promise<FormState> {
  const id = field(formData, "id");
  const fieldErrors: Record<string, string> = {};
  const name = field(formData, "name");
  const slug = field(formData, "slug");
  const position = field(formData, "position");
  if (!name) {
    fieldErrors.name = "Enter a name.";
  } else if (name.length > 255) {
    fieldErrors.name = "Use at most 255 characters.";
  }
  if (!slug) {
    fieldErrors.slug = "Enter a slug.";
  } else if (slug.length > 255) {
    fieldErrors.slug = "Use at most 255 characters.";
  } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug.toLowerCase())) {
    fieldErrors.slug = "Use lowercase letters, digits and dashes.";
  }
  if (position && !/^\d+$/.test(position)) {
    fieldErrors.position = "Enter a whole number, 0 or more.";
  } else if (Number(position) > 100000) {
    fieldErrors.position = "Use at most 100000.";
  }
  if (Object.keys(fieldErrors).length) {
    return {
      fieldErrors,
    };
  }
  const body = {
    name,
    slug,
    parentId: field(formData, "parentId") || null,
    position: Number.parseInt(position || "0", 10) || 0,
  };
  const res = await api(id ? `/categories/${id}` : "/categories", {
    method: id ? "PATCH" : "POST",
    body,
  });
  return toFormState(res, id ? "Category saved." : "Category created.", {
    category_slug_taken: "slug",
    category_cycle: "parentId",
    category_not_found: "parentId",
  });
}
