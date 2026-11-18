import { api } from "@/lib/api";

export type AddressState = {
  ok?: boolean;
  message?: string;
  // Shown under AddressFields' inputs, keyed by field name (without prefix)
  fieldErrors?: Record<string, string>;
};

type Fail = {
  code?: string | null;
  message?: string | null;
  data?: unknown;
};

// Same limits as the api's address DTO; required ones as in the domain
const LIMITS: Record<string, number> = {
  label: 100,
  recipientName: 255,
  phone: 32,
  line1: 255,
  line2: 255,
  city: 255,
  region: 255,
  postalCode: 32,
};
const REQUIRED: Record<string, string> = {
  recipientName: "Enter the recipient's name.",
  phone: "Enter a phone number.",
  line1: "Enter the address.",
  city: "Enter the city.",
};

// Checked before any request, keyed by field name without prefix; null when
// fine
export function checkAddress(
  formData: FormData,
  prefix = "",
): Record<string, string> | null {
  const errors: Record<string, string> = {};
  const value = (name: string) =>
    String(formData.get(`${prefix}${name}`) ?? "").trim();
  if (!value("countryCode")) {
    errors.countryCode = "Choose a country.";
  }
  for (const [name, message] of Object.entries(REQUIRED)) {
    if (!value(name)) {
      errors[name] = message;
    }
  }
  for (const [name, max] of Object.entries(LIMITS)) {
    if (!errors[name] && value(name).length > max) {
      errors[name] = `Use at most ${max} characters.`;
    }
  }
  return Object.keys(errors).length ? errors : null;
}

// The api's validation issues and address domain errors by field
function addressErrors(res: Fail): Record<string, string> | null {
  const issues =
    (
      res.data as
        | {
            issues?: {
              path: string;
              message: string;
            }[];
          }
        | undefined
    )?.issues ?? [];
  const errors: Record<string, string> = {};
  for (const i of issues) {
    const name = i.path.split(".")[0];
    errors[name === "regionCode" ? "region" : name] ??= i.message;
  }
  const message = res.message ?? "";
  if (
    res.code === "country_not_shipped" ||
    /^(Unknown country|Country )/.test(message)
  ) {
    errors.countryCode = message;
  } else if (res.code === "invalid_shop_input") {
    const required = /^(\w+) is required$/.exec(message);
    if (required && required[1] in REQUIRED) {
      errors[required[1]] = REQUIRED[required[1]];
    } else if (message.startsWith("Region ")) {
      errors.region = message;
    }
  }
  return Object.keys(errors).length ? errors : null;
}

const FIELDS = [
  "label",
  "recipientName",
  "phone",
  "line1",
  "line2",
  "city",
  "region",
  "regionCode",
  "postalCode",
  "countryCode",
] as const;

// Own addresses only; the api checks ownership, the country and the region.
// Callers run `router.invalidate()` after a success.
async function call(
  path: string,
  init: {
    method: string;
    body?: unknown;
  },
): Promise<AddressState> {
  const res = await api(path, init);
  if (res.status !== "success") {
    const fieldErrors = addressErrors(res);
    if (fieldErrors) {
      return {
        fieldErrors,
      };
    }
    return {
      message: res.message ?? "Something went wrong.",
    };
  }
  return {
    ok: true,
  };
}

// Blank optional fields are sent as null; a picked region sends regionCode
// (the api fills region with its name)
export async function saveAddress(
  id: string | null,
  formData: FormData,
): Promise<AddressState> {
  const fieldErrors = checkAddress(formData);
  const body = addressBody(formData);
  if (fieldErrors || !body) {
    return {
      fieldErrors: fieldErrors ?? {
        countryCode: "Choose a country.",
      },
    };
  }
  return call(id ? `/me/addresses/${id}` : "/me/addresses", {
    method: id ? "PATCH" : "POST",
    body,
  });
}

// The api body from AddressFields; null without a country
function addressBody(
  formData: FormData,
  prefix = "",
): Record<string, unknown> | null {
  const body: Record<string, unknown> = {};
  for (const name of FIELDS) {
    const value = formData.get(`${prefix}${name}`);
    if (value !== null) {
      body[name] = String(value).trim() || null;
    }
  }
  if (!body.countryCode) {
    return null;
  }
  if (formData.has(`${prefix}regionCode`)) {
    body.region = null;
  } else {
    body.regionCode = null;
  }
  if (formData.get(`${prefix}isDefault`) === "on") {
    body.isDefault = true;
  }
  return body;
}

export async function makeDefault(id: string): Promise<AddressState> {
  return call(`/me/addresses/${id}`, {
    method: "PATCH",
    body: {
      isDefault: true,
    },
  });
}

export async function deleteAddress(id: string): Promise<AddressState> {
  return call(`/me/addresses/${id}`, {
    method: "DELETE",
  });
}
