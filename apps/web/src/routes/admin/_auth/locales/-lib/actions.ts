import { call } from "@/lib/admin/call";
import {
  checkName,
  checkPosition,
  type GeoFormState,
  geoCall,
} from "@/lib/admin/geo-call";
import type { ShopActionState } from "@/lib/shop";

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "").trim();

// Client calls (the web panel's server actions); callers run
// router.invalidate() after a success.

// Create when there's no id, else update (the code is fixed once created)
export async function saveLocale(
  _prev: GeoFormState,
  formData: FormData,
): Promise<GeoFormState> {
  const id = field(formData, "id");
  const fieldErrors: Record<string, string> = {};
  checkName(fieldErrors, field(formData, "name"), 100);
  checkPosition(fieldErrors, field(formData, "position"));
  if (field(formData, "nativeName").length > 100) {
    fieldErrors.nativeName = "Use at most 100 characters.";
  }
  const code = field(formData, "code");
  if (!id && (!code || code.length > 16)) {
    fieldErrors.code = code
      ? "Use at most 16 characters."
      : "Enter a code, e.g. vi-VN or en.";
  }
  if (Object.keys(fieldErrors).length) {
    return {
      fieldErrors,
    };
  }
  const common = {
    name: field(formData, "name"),
    nativeName: field(formData, "nativeName"),
    rtl: formData.get("rtl") === "on",
    position: Number.parseInt(field(formData, "position") || "0", 10) || 0,
  };
  const isDefault = formData.get("isDefault") === "on";
  return id
    ? geoCall(
        `/locales/${id}`,
        {
          method: "PATCH",
          body: {
            ...common,
            active: formData.get("active") === "on",
            // Only moving the default here; it can't be unset
            ...(isDefault
              ? {
                  isDefault: true,
                }
              : {}),
          },
        },
        "Locale saved.",
      )
    : geoCall(
        "/locales",
        {
          method: "POST",
          body: {
            ...common,
            code: field(formData, "code"),
            isDefault,
          },
        },
        "Locale added.",
      );
}

export async function updateLocale(
  id: string,
  body: {
    active?: boolean;
    isDefault?: boolean;
  },
  done: string,
): Promise<ShopActionState> {
  return call(
    `/locales/${id}`,
    {
      method: "PATCH",
      body,
    },
    done,
  );
}

export async function deleteLocale(id: string): Promise<ShopActionState> {
  return call(
    `/locales/${id}`,
    {
      method: "DELETE",
    },
    "Locale deleted.",
  );
}
