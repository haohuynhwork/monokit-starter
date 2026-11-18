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
export async function saveCurrency(
  _prev: GeoFormState,
  formData: FormData,
): Promise<GeoFormState> {
  const id = field(formData, "id");
  const fieldErrors: Record<string, string> = {};
  checkName(fieldErrors, field(formData, "name"), 100);
  checkPosition(fieldErrors, field(formData, "position"));
  if (!id && !/^[A-Za-z]{3}$/.test(field(formData, "code"))) {
    fieldErrors.code = "3 letters (ISO 4217), e.g. VND.";
  }
  if (field(formData, "symbol").length > 10) {
    fieldErrors.symbol = "Use at most 10 characters.";
  }
  if (!/^[0-4]?$/.test(field(formData, "decimals"))) {
    fieldErrors.decimals = "A whole number from 0 to 4.";
  }
  const rate = field(formData, "rate");
  if (!/^\d{1,10}(\.\d{1,10})?$/.test(rate) || !/[1-9]/.test(rate)) {
    fieldErrors.rate = "A number above 0 with up to 10 decimals.";
  }
  if (Object.keys(fieldErrors).length) {
    return {
      fieldErrors,
    };
  }
  const common = {
    name: field(formData, "name"),
    symbol: field(formData, "symbol"),
    decimals: Number.parseInt(field(formData, "decimals") || "2", 10),
    rate: field(formData, "rate"),
    position: Number.parseInt(field(formData, "position") || "0", 10) || 0,
  };
  return id
    ? geoCall(
        `/currencies/${id}`,
        {
          method: "PATCH",
          body: {
            ...common,
            active: formData.get("active") === "on",
          },
        },
        "Currency saved.",
      )
    : geoCall(
        "/currencies",
        {
          method: "POST",
          body: {
            ...common,
            code: field(formData, "code"),
          },
        },
        "Currency added.",
      );
}

export async function setCurrencyActive(
  id: string,
  active: boolean,
): Promise<ShopActionState> {
  return call(
    `/currencies/${id}`,
    {
      method: "PATCH",
      body: {
        active,
      },
    },
    active ? "Currency activated." : "Currency deactivated.",
  );
}

export async function deleteCurrency(id: string): Promise<ShopActionState> {
  return call(
    `/currencies/${id}`,
    {
      method: "DELETE",
    },
    "Currency deleted.",
  );
}
