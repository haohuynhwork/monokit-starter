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
export async function saveRegion(
  _prev: GeoFormState,
  formData: FormData,
): Promise<GeoFormState> {
  const id = field(formData, "id");
  const fieldErrors: Record<string, string> = {};
  checkName(fieldErrors, field(formData, "name"), 255);
  checkPosition(fieldErrors, field(formData, "position"));
  const country = field(formData, "countryCode").toUpperCase();
  const code = field(formData, "code").toUpperCase();
  if (
    !id &&
    (code.length > 20 ||
      !code.startsWith(`${country}-`) ||
      code === `${country}-`)
  ) {
    fieldErrors.code =
      code.length > 20
        ? "Use at most 20 characters."
        : `Starts with ${country}-, e.g. ${country}-01.`;
  }
  if (Object.keys(fieldErrors).length) {
    return {
      fieldErrors,
    };
  }
  const common = {
    name: field(formData, "name"),
    parentId: field(formData, "parentId") || null,
    position: Number.parseInt(field(formData, "position") || "0", 10) || 0,
  };
  return id
    ? geoCall(
        `/regions/${id}`,
        {
          method: "PATCH",
          body: {
            ...common,
            active: formData.get("active") === "on",
          },
        },
        "Region saved.",
      )
    : geoCall(
        "/regions",
        {
          method: "POST",
          body: {
            ...common,
            countryCode: field(formData, "countryCode"),
            code: field(formData, "code"),
          },
        },
        "Region created.",
      );
}

export async function setRegionActive(
  id: string,
  active: boolean,
): Promise<ShopActionState> {
  return call(
    `/regions/${id}`,
    {
      method: "PATCH",
      body: {
        active,
      },
    },
    active ? "Region activated." : "Region deactivated.",
  );
}

export async function deleteRegion(id: string): Promise<ShopActionState> {
  return call(
    `/regions/${id}`,
    {
      method: "DELETE",
    },
    "Region deleted.",
  );
}
