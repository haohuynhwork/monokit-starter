import { COUNTRIES, countryName, subdivisions } from "@packages/geo";
import { Field, FieldError, FieldLabel } from "@packages/ui/components/field";
import { Input } from "@packages/ui/components/input";
import { useMemo, useState } from "react";
import { Combobox } from "@/components/combobox";
import type { ShippingAddress } from "@/lib/types";

// Field names and labels that differ by country; the rest use DEFAULT
const LABELS: Record<
  string,
  {
    region: string;
    city: string;
    postalCode: string;
  }
> = {
  US: {
    region: "State",
    city: "City",
    postalCode: "ZIP code",
  },
  VN: {
    region: "Province / City",
    city: "District / Ward",
    postalCode: "Postal code",
  },
};
const DEFAULT = {
  region: "Region",
  city: "City",
  postalCode: "Postal code",
};

// Inputs of an address form, posted by name (countryCode, regionCode, region,
// city, ...). Countries: the shop's allowed list (configs
// 'shipping.countries'), all when null. Regions: a picker when the country has
// ISO subdivisions, else a text field.
export function AddressFields({
  allowedCountries,
  defaultValue,
  errors,
  locale = "en",
  prefix = "",
}: {
  allowedCountries: string[] | null;
  defaultValue?: Partial<ShippingAddress>;
  // Shown under each input, keyed by its posted name (with `prefix`);
  // "region" also covers the region picker
  errors?: Record<string, string>;
  locale?: string;
  // Prepended to every field name and id, for a second address in one form
  // (checkout's billing: "billing.")
  prefix?: string;
}) {
  const countries = useMemo(
    () =>
      (allowedCountries ?? COUNTRIES)
        .map((code) => ({
          value: code,
          label: countryName(code, locale),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, locale)),
    [
      allowedCountries,
      locale,
    ],
  );
  const [country, setCountry] = useState<string | null>(
    defaultValue?.countryCode ??
      (countries.length === 1 ? countries[0].value : null),
  );
  const [regionCode, setRegionCode] = useState<string | null>(
    defaultValue?.regionCode ?? null,
  );
  const regions = useMemo(
    () =>
      country
        ? subdivisions(country).map((s) => ({
            value: s.code,
            label: s.name,
          }))
        : [],
    [
      country,
    ],
  );
  const labels = (country && LABELS[country]) || DEFAULT;
  const error = (name: string) => errors?.[`${prefix}${name}`];
  const regionError = error("region") ?? error("regionCode");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        className="sm:col-span-2"
        data-invalid={!!error("countryCode") || undefined}
      >
        <FieldLabel htmlFor={`addr-${prefix}country`}>Country</FieldLabel>
        <Combobox
          id={`addr-${prefix}country`}
          options={countries}
          value={country}
          onChange={(next) => {
            setCountry(next);
            setRegionCode(null);
          }}
          placeholder="Choose a country"
          searchPlaceholder="Search countries…"
        />
        <input
          type="hidden"
          name={`${prefix}countryCode`}
          value={country ?? ""}
        />
        <FieldError>{error("countryCode")}</FieldError>
      </Field>
      <Text
        prefix={prefix}
        errors={errors}
        name="recipientName"
        label="Recipient"
        value={defaultValue?.recipientName}
      />
      <Text
        prefix={prefix}
        errors={errors}
        name="phone"
        label="Phone"
        type="tel"
        value={defaultValue?.phone}
      />
      <Text
        prefix={prefix}
        errors={errors}
        name="line1"
        label="Address"
        value={defaultValue?.line1}
        wide
      />
      <Text
        prefix={prefix}
        errors={errors}
        name="line2"
        label="Address line 2"
        value={defaultValue?.line2}
        wide
      />
      {regions.length > 0 ? (
        <Field data-invalid={!!regionError || undefined}>
          <FieldLabel htmlFor={`addr-${prefix}region`}>
            {labels.region}
          </FieldLabel>
          <Combobox
            id={`addr-${prefix}region`}
            options={regions}
            value={regionCode}
            onChange={setRegionCode}
            placeholder={`Choose a ${labels.region.toLowerCase()}`}
          />
          <input
            type="hidden"
            name={`${prefix}regionCode`}
            value={regionCode ?? ""}
          />
          <FieldError>{regionError}</FieldError>
        </Field>
      ) : (
        // Typed; key resets it when the country changes
        <Text
          prefix={prefix}
          error={regionError}
          key={country ?? ""}
          name="region"
          label={labels.region}
          value={
            country === defaultValue?.countryCode ? defaultValue?.region : null
          }
        />
      )}
      <Text
        prefix={prefix}
        errors={errors}
        name="city"
        label={labels.city}
        value={defaultValue?.city}
      />
      <Text
        prefix={prefix}
        errors={errors}
        name="postalCode"
        label={labels.postalCode}
        value={defaultValue?.postalCode}
      />
      <Text
        prefix={prefix}
        errors={errors}
        name="label"
        label="Label (e.g. Home)"
        value={defaultValue?.label}
      />
    </div>
  );
}

function Text({
  prefix,
  errors,
  error: given,
  name,
  label,
  value,
  type = "text",
  wide,
}: {
  prefix: string;
  errors?: Record<string, string>;
  error?: string;
  name: string;
  label: string;
  value?: string | null;
  type?: string;
  wide?: boolean;
}) {
  const id = `addr-${prefix}${name}`;
  const error = given ?? errors?.[`${prefix}${name}`];
  return (
    <Field
      className={wide ? "sm:col-span-2" : undefined}
      data-invalid={!!error || undefined}
    >
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={`${prefix}${name}`}
        type={type}
        defaultValue={value ?? ""}
        aria-invalid={!!error || undefined}
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}
