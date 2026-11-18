import { Button } from "@packages/ui/components/button";
import { FieldError } from "@packages/ui/components/field";
import { Input } from "@packages/ui/components/input";
import { Textarea } from "@packages/ui/components/textarea";
import { cn } from "@packages/ui/lib/utils";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { flushSync } from "react-dom";
import { AddressFields } from "@/components/address-fields";
import { notifyCartChanged } from "@/lib/site/guest";
import type { SavedAddress } from "@/lib/types";
import { type CheckoutState, placeOrder } from "./place-order";

const PAYMENT_METHODS = [
  {
    value: "cod",
    label: "Cash on delivery",
    hint: "Pay when the parcel arrives.",
  },
  {
    value: "bank_transfer",
    label: "Bank transfer",
    hint: "Payment details follow on the order page.",
  },
] as const;

// AddressFields' inputs, to tell their errors from the order's
const ADDRESS_FIELDS = [
  "countryCode",
  "recipientName",
  "phone",
  "line1",
  "line2",
  "region",
  "regionCode",
  "city",
  "postalCode",
  "label",
];

// Each part sits in a card like the order summary
const cardClass = "rounded-lg border p-4";

// A picked choice gets a soft tint, not a dark border
const choiceClass =
  "flex cursor-pointer gap-3 rounded-lg border p-3 text-sm has-checked:border-primary/40 has-checked:bg-muted/50";

// Address, payment and note for /checkout. `buyNow` orders that one
// variant; otherwise the `cartItems` lines of the cart.
export function CheckoutForm({
  addresses,
  allowedCountries,
  buyNow,
  cartItems,
  disabled,
}: {
  addresses: SavedAddress[];
  // Countries the shop ships to (null: all), for a new address
  allowedCountries: string[] | null;
  buyNow?: {
    variantId: string;
    quantity: number;
  };
  // The cart lines (variant ids) to order; the rest stays in the cart
  cartItems?: string[];
  disabled: boolean;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const [state, setState] = useState<CheckoutState>({});
  const [pending, setPending] = useState(false);
  const id = useId();
  const fieldError = (name: string) => state.fieldErrors?.[name];
  const [picked, setPicked] = useState(
    () => addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "new",
  );
  const [separate, setSeparate] = useState(false);
  const [billingPicked, setBillingPicked] = useState(
    () => addresses[0]?.id ?? "new",
  );
  // New addresses were saved but the order failed: they are listed now,
  // pick them (adjusted during render, not in an effect)
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.addressId) {
      setPicked(state.addressId);
    }
    if (state.billingAddressId) {
      setBillingPicked(state.billingAddressId);
    }
  }
  return (
    <form
      noValidate
      // Submitted by hand so a failed order keeps what was typed (a form
      // action resets the form)
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setPending(true);
        const { orderId, ...next } = await placeOrder(data);
        setState(next);
        if (orderId) {
          // The cart lost the ordered lines
          notifyCartChanged();
          await navigate({
            to: "/shop/checkout/success",
            search: {
              order: orderId,
            },
          });
          return;
        }
        if (next.addressId || next.billingAddressId) {
          // Lists the new addresses
          await router.invalidate();
        }
        setPending(false);
      }}
      className="flex flex-col gap-6"
    >
      {buyNow && (
        <>
          <input type="hidden" name="variantId" value={buyNow.variantId} />
          <input type="hidden" name="quantity" value={buyNow.quantity} />
        </>
      )}
      {cartItems && (
        <input type="hidden" name="items" value={cartItems.join(",")} />
      )}
      <fieldset className={cn(cardClass, "flex flex-col gap-2")}>
        <legend className="float-left mb-2 w-full font-semibold">
          Ship to
        </legend>
        <AddressChoice
          name="addressId"
          addresses={addresses}
          allowedCountries={allowedCountries}
          picked={picked}
          onPick={setPicked}
          newLabel={addresses.length ? "New address" : "Shipping address"}
          canBeDefault={addresses.length > 0}
          errors={state.fieldErrors}
        />
      </fieldset>
      <fieldset className={cn(cardClass, "flex flex-col gap-3")}>
        <legend className="float-left mb-2 w-full font-semibold">
          Billing
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!separate}
            onChange={(e) => setSeparate(!e.target.checked)}
            className="size-4 accent-primary"
          />
          Same as the shipping address
        </label>
        {separate && (
          <>
            <input type="hidden" name="billingSeparate" value="on" />
            <div className="flex flex-col gap-2">
              <AddressChoice
                name="billingAddressId"
                prefix="billing."
                addresses={addresses}
                allowedCountries={allowedCountries}
                picked={billingPicked}
                onPick={setBillingPicked}
                newLabel={addresses.length ? "New address" : "Billing address"}
                canBeDefault={false}
                errors={state.fieldErrors}
              />
            </div>
          </>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            htmlFor={`${id}-company`}
            className="flex flex-col gap-1 text-sm"
          >
            Company (optional)
            <Input
              id={`${id}-company`}
              name="billingCompany"
              aria-invalid={!!fieldError("billingCompany") || undefined}
              maxLength={255}
              autoComplete="organization"
            />
            <FieldError>{fieldError("billingCompany")}</FieldError>
          </label>
          <label
            htmlFor={`${id}-taxCode`}
            className="flex flex-col gap-1 text-sm"
          >
            Tax code (optional)
            <Input
              id={`${id}-taxCode`}
              name="billingTaxCode"
              aria-invalid={!!fieldError("billingTaxCode") || undefined}
              maxLength={32}
              placeholder="e.g. 0101234567"
            />
            <FieldError>{fieldError("billingTaxCode")}</FieldError>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          For a company invoice. Leave blank for a personal order.
        </p>
      </fieldset>
      <fieldset className={cn(cardClass, "flex flex-col gap-2")}>
        <legend className="float-left mb-2 w-full font-semibold">
          Payment
        </legend>
        {PAYMENT_METHODS.map((m) => (
          <label key={m.value} className={choiceClass}>
            <input
              type="radio"
              name="paymentMethod"
              value={m.value}
              defaultChecked={m.value === "cod"}
              className="mt-0.5 accent-primary"
            />
            <span>
              <span className="font-medium">{m.label}</span>
              <span className="block text-muted-foreground">{m.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label
        htmlFor={`${id}-note`}
        className={cn(cardClass, "flex flex-col gap-2")}
      >
        <span className="font-semibold">Note (optional)</span>
        <Textarea
          id={`${id}-note`}
          name="note"
          aria-invalid={!!fieldError("note") || undefined}
          rows={3}
          maxLength={500}
          placeholder="Delivery instructions, gift message…"
        />
        <FieldError>{fieldError("note")}</FieldError>
      </label>
      {state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending || disabled}>
        {pending ? "Placing order…" : "Place order"}
      </Button>
    </form>
  );
}

// Saved addresses as radio cards plus "New address", whose fields (named
// with `prefix`) show only while it is picked, so their required inputs
// don't block the other choices. A new one is saved to the account with
// the order.
function AddressChoice({
  name,
  prefix = "",
  addresses,
  allowedCountries,
  picked,
  onPick,
  newLabel,
  canBeDefault,
  errors,
}: {
  name: string;
  prefix?: string;
  addresses: SavedAddress[];
  allowedCountries: string[] | null;
  picked: string;
  onPick: (id: string) => void;
  newLabel: string;
  canBeDefault: boolean;
  // Checkout's field errors, keyed by posted name (with `prefix`)
  errors?: Record<string, string>;
}) {
  const [open, setOpen] = useState(true);
  // Unfold the new address when one of its fields is wrong
  const invalid = ADDRESS_FIELDS.some((name) => errors?.[`${prefix}${name}`]);
  // (set while rendering, once per new set of errors)
  const [seenErrors, setSeenErrors] = useState(errors);
  if (errors !== seenErrors) {
    setSeenErrors(errors);
    if (invalid) {
      setOpen(true);
    }
  }
  const panelId = useId();
  return (
    <>
      {addresses.map((a) => (
        <label key={a.id} className={choiceClass}>
          <input
            type="radio"
            name={name}
            value={a.id}
            checked={picked === a.id}
            onChange={() => onPick(a.id)}
            className="mt-0.5 accent-primary"
          />
          <span>
            <span className="font-medium">
              {a.label ? `${a.label}: ` : ""}
              {a.recipientName}
            </span>
            <span className="block text-muted-foreground">
              {[
                a.line1,
                a.line2,
                a.city,
                a.region,
                a.postalCode,
                a.countryCode,
              ]
                .filter(Boolean)
                .join(", ")}
            </span>
            {a.phone && (
              <span className="block text-muted-foreground">{a.phone}</span>
            )}
          </span>
        </label>
      ))}
      <div
        className={cn(
          "rounded-lg border text-sm",
          picked === "new" && "border-primary/40 bg-muted/50",
        )}
      >
        <div className="flex items-center">
          {/* Clicking the header picks it; once picked, it folds the fields.
              Keyboard users have the radio and the chevron button. */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: the chevron button is the keyboard toggle */}
          <label
            className="flex flex-1 cursor-pointer gap-3 p-3"
            onClick={(e) => {
              if (picked === "new") {
                e.preventDefault();
                setOpen((o) => !o);
              }
            }}
          >
            <input
              type="radio"
              name={name}
              value="new"
              checked={picked === "new"}
              onChange={() => {
                onPick("new");
                setOpen(true);
              }}
              className="mt-0.5 accent-primary"
            />
            <span className="font-medium">{newLabel}</span>
          </label>
          {picked === "new" && (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              aria-label={open ? `Hide ${newLabel}` : `Show ${newLabel}`}
              onClick={() => setOpen((o) => !o)}
              className="mr-2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  open && "rotate-180",
                )}
              />
            </button>
          )}
        </div>
        {/* Mounted while picked, so collapsing keeps what was typed; a
            field the browser rejects on submit opens it again */}
        {picked === "new" && (
          <div
            id={panelId}
            hidden={!open}
            onInvalidCapture={() => flushSync(() => setOpen(true))}
            className="flex flex-col gap-4 border-t p-3"
          >
            <AddressFields
              allowedCountries={allowedCountries}
              prefix={prefix}
              errors={errors}
            />
            {canBeDefault && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name={`${prefix}isDefault`}
                  className="size-4 accent-primary"
                />
                Use as my default address
              </label>
            )}
            <p className="text-xs text-muted-foreground">
              Saved to your account for next time.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
