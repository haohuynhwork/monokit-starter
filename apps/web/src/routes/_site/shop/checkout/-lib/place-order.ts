import { api } from "@/lib/api";
import { ORDER_ERRORS } from "@/lib/site/shop-client";
import type { Cart, Order } from "@/lib/types";
import { checkAddress } from "@/routes/admin/_auth/account/-lib/address-actions";

export type CheckoutState = {
  message?: string;
  // New addresses saved before the order failed: pick them next time, so a
  // retry doesn't add them twice
  addressId?: string;
  billingAddressId?: string;
  // Under the input they belong to, keyed by its name ("city",
  // "billing.city", "note", ...)
  fieldErrors?: Record<string, string>;
};

type Issue = {
  path: string;
  message: string;
};

const withPrefix = (errors: Record<string, string>, prefix: string) =>
  Object.fromEntries(
    Object.entries(errors).map(([name, message]) => [
      `${prefix}${name}`,
      message,
    ]),
  );

// Checked before any request, so a bad billing field doesn't leave the
// shipping address saved without an order
function checkCheckout(formData: FormData): Record<string, string> | null {
  const value = (name: string) => String(formData.get(name) ?? "").trim();
  let errors: Record<string, string> = {};
  if (value("addressId") === "new") {
    errors = {
      ...checkAddress(formData),
    };
  }
  if (
    value("billingSeparate") === "on" &&
    value("billingAddressId") === "new"
  ) {
    errors = {
      ...errors,
      ...withPrefix(checkAddress(formData, "billing.") ?? {}, "billing."),
    };
  }
  for (const [name, max] of [
    [
      "billingCompany",
      255,
    ],
    [
      "billingTaxCode",
      32,
    ],
    [
      "note",
      1000,
    ],
  ] as const) {
    if (value(name).length > max) {
      errors[name] = `Use at most ${max} characters.`;
    }
  }
  return Object.keys(errors).length ? errors : null;
}

const ADDRESS_FIELDS = [
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

// The api body of a new address from AddressFields' inputs (named with
// `prefix`): blanks are null, a picked region sends regionCode
function addressBody(formData: FormData, prefix: string) {
  const body: Record<string, unknown> = {};
  for (const name of ADDRESS_FIELDS) {
    const value = formData.get(`${prefix}${name}`);
    if (value !== null) {
      body[name] = String(value).trim() || null;
    }
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

// Saves a new address to the account; the id, or the errors under their
// inputs
async function createAddress(
  formData: FormData,
  prefix: string,
): Promise<{
  id?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}> {
  const res = await api<{
    id: string;
  }>("/me/addresses", {
    method: "POST",
    body: addressBody(formData, prefix),
    silent: true,
  });
  if (res.status === "success" && res.data) {
    return {
      id: res.data.id,
    };
  }
  const issues =
    (
      res.data as
        | {
            issues?: Issue[];
          }
        | undefined
    )?.issues ?? [];
  const fieldErrors: Record<string, string> = {};
  for (const i of issues) {
    const name = i.path.split(".")[0];
    fieldErrors[name === "regionCode" ? "region" : name] ??= i.message;
  }
  if (res.code === "country_not_shipped") {
    fieldErrors.countryCode = res.message ?? "We don't ship there.";
  }
  return {
    message: res.message ?? "Something went wrong.",
    fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
  };
}

// The cart's available lines, only `picked` ones when given (ticked on the
// cart page)
async function availableCartLines(picked: string[]) {
  const cart = await api<Cart>("/me/cart", {
    silent: true,
  });
  const lines: Cart["items"] =
    cart.status === "success" && cart.data ? cart.data.items : [];
  return lines
    .filter(
      (i) =>
        i.available && (picked.length === 0 || picked.includes(i.variantId)),
    )
    .map((i) => ({
      variantId: i.variantId,
      quantity: i.quantity,
    }));
}

// Places the /checkout order: "Buy now" sends one variant (`variantId`,
// `quantity`); otherwise the cart lines ticked on the cart page (`items`,
// all available ones when empty), which the api takes out of the cart (the
// rest stays). `orderId` is set on success.
export async function placeOrder(formData: FormData): Promise<
  CheckoutState & {
    orderId?: string;
  }
> {
  const buyNow = String(formData.get("variantId") ?? "");
  const items = buyNow
    ? [
        {
          variantId: buyNow,
          quantity: Math.max(1, Number(formData.get("quantity")) || 1),
        },
      ]
    : await availableCartLines(
        String(formData.get("items") ?? "")
          .split(",")
          .filter(Boolean),
      );
  if (items.length === 0) {
    return {
      message: "Nothing in the cart can be ordered right now.",
    };
  }
  const fieldErrors = checkCheckout(formData);
  if (fieldErrors) {
    return {
      fieldErrors,
    };
  }
  // "New address": saved to the account first, then ordered to
  let addressId = String(formData.get("addressId") ?? "");
  let created: string | undefined;
  if (addressId === "new") {
    const address = await createAddress(formData, "");
    if (!address.id) {
      return {
        message: address.message,
        fieldErrors: address.fieldErrors,
      };
    }
    addressId = created = address.id;
  }
  // Billing: another address ("billing.*" fields for a new one) and/or
  // company details; omitted when it is the shipping address alone
  const separate = formData.get("billingSeparate") === "on";
  const company = String(formData.get("billingCompany") ?? "").trim() || null;
  const taxCode = String(formData.get("billingTaxCode") ?? "").trim() || null;
  let billingAddressId: string | null = null;
  let createdBilling: string | undefined;
  if (separate) {
    billingAddressId = String(formData.get("billingAddressId") ?? "") || null;
    if (billingAddressId === "new") {
      const address = await createAddress(formData, "billing.");
      if (!address.id) {
        return {
          message: address.message && `Billing address: ${address.message}`,
          fieldErrors:
            address.fieldErrors && withPrefix(address.fieldErrors, "billing."),
          addressId: created,
        };
      }
      billingAddressId = createdBilling = address.id;
    }
  }
  const res = await api<Order>("/me/orders", {
    method: "POST",
    silent: true,
    body: {
      items,
      addressId,
      paymentMethod: String(formData.get("paymentMethod") ?? "cod"),
      note: String(formData.get("note") ?? "").trim() || null,
      ...((billingAddressId || company || taxCode) && {
        billing: {
          addressId: billingAddressId,
          company,
          taxCode,
        },
      }),
    },
  });
  if (res.status !== "success" || !res.data) {
    // The order's own inputs; other issues (items, ids) go in the banner
    const ORDER_FIELDS: Record<string, string> = {
      note: "note",
      "billing.company": "billingCompany",
      "billing.taxCode": "billingTaxCode",
    };
    const errors: Record<string, string> = {};
    for (const i of (
      res.data as
        | {
            issues?: Issue[];
          }
        | undefined
    )?.issues ?? []) {
      const name = ORDER_FIELDS[i.path.split(".").slice(0, 2).join(".")];
      if (name) {
        errors[name] ??= i.message;
      }
    }
    if (Object.keys(errors).length) {
      return {
        fieldErrors: errors,
        addressId: created,
        billingAddressId: createdBilling,
      };
    }
    return {
      message:
        (res.code && ORDER_ERRORS[res.code]) ||
        res.message ||
        "Something went wrong.",
      addressId: created,
      billingAddressId: createdBilling,
    };
  }
  return {
    orderId: res.data.id,
  };
}
