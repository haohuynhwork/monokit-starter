import { call } from "@/lib/admin/call";
import type { FormState } from "@/lib/api";

// What each media form gets back
export type MediaState = FormState;

// Domain error codes that are about one input
const FIELD_OF_CODE: Record<string, string> = {
  invalid_name: "name",
  name_taken: "name",
  invalid_link_url: "url",
  not_a_folder: "parentId",
  move_into_itself: "parentId",
};

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "");
const parentId = (formData: FormData) => field(formData, "parentId") || null;

// Callers reload the listing on success (the browser's `reload`)
export function moveAsset(formData: FormData): Promise<MediaState> {
  return call(
    `/assets/${field(formData, "id")}/move`,
    {
      method: "POST",
      body: {
        parentId: parentId(formData),
      },
    },
    "Moved.",
    FIELD_OF_CODE,
  );
}

export function setVisibility(
  id: string,
  visibility: "public" | "private",
): Promise<MediaState> {
  return call(
    `/assets/${id}`,
    {
      method: "PATCH",
      body: {
        visibility,
      },
    },
    visibility === "public" ? "Now public." : "Now private.",
    FIELD_OF_CODE,
  );
}
