import {
  CountryNotShippedError,
  InvalidShopInputError,
} from "./shop.errors.js";

export interface AddressFields {
  label: string | null;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  // ISO 3166-2 ('VN-HN'); when set, region is its name
  regionCode: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
}

export interface AddressProps extends AddressFields {
  id: bigint | null;
  userId: bigint;
  isDefault: boolean;
  deletedAt: string | null;
}

// Where the shop ships and which regions exist; the application builds it
// from configs and the country data
export interface AddressRules {
  // NULL: anywhere
  allowedCountries: readonly string[] | null;
  isCountry(code: string): boolean;
  // The region's name; undefined when the code isn't an available region of
  // the country (unknown, another country's, or retired)
  regionName(regionCode: string, countryCode: string): string | undefined;
}

export function canShipTo(
  countryCode: string,
  allowedCountries: readonly string[] | null,
): boolean {
  return allowedCountries === null || allowedCountries.includes(countryCode);
}

const required = [
  "recipientName",
  "phone",
  "line1",
  "city",
] as const;

function clean(input: AddressFields, rules: AddressRules): AddressFields {
  const out = {
    ...input,
  };
  for (const key of required) {
    out[key] = out[key].trim();
    if (!out[key]) {
      throw new InvalidShopInputError(`${key} is required`);
    }
  }
  for (const key of [
    "label",
    "line2",
    "region",
    "regionCode",
    "postalCode",
  ] as const) {
    out[key] = out[key]?.trim() || null;
  }
  out.countryCode = out.countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(out.countryCode)) {
    throw new InvalidShopInputError("Country is a 2-letter code, e.g. VN");
  }
  if (!rules.isCountry(out.countryCode)) {
    throw new InvalidShopInputError(`Unknown country ${out.countryCode}`);
  }
  if (!canShipTo(out.countryCode, rules.allowedCountries)) {
    throw new CountryNotShippedError(out.countryCode);
  }
  if (out.regionCode) {
    out.regionCode = out.regionCode.toUpperCase();
    const name = rules.regionName(out.regionCode, out.countryCode);
    if (name === undefined) {
      throw new InvalidShopInputError(
        `Region ${out.regionCode} is not available in ${out.countryCode}`,
      );
    }
    out.region = name;
  }
  return out;
}

// A user's saved shipping address; orders copy it (see ideas/orders/address.md)
export class Address {
  private constructor(private props: AddressProps) {}

  static create(
    userId: bigint,
    fields: AddressFields,
    isDefault: boolean,
    rules: AddressRules,
  ): Address {
    return new Address({
      id: null,
      userId,
      ...clean(fields, rules),
      isDefault,
      deletedAt: null,
    });
  }

  static restore(props: AddressProps): Address {
    return new Address(props);
  }

  get id(): bigint | null {
    return this.props.id;
  }
  get isDefault(): boolean {
    return this.props.isDefault;
  }

  isOwnedBy(userId: bigint): boolean {
    return this.props.userId === userId;
  }

  get countryCode(): string {
    return this.props.countryCode;
  }

  update(
    fields: Partial<AddressFields>,
    rules: AddressRules,
    isDefault?: boolean,
  ): void {
    const { id, userId, deletedAt, isDefault: was, ...current } = this.props;
    this.props = {
      id,
      userId,
      deletedAt,
      isDefault: isDefault ?? was,
      // A new country without a new region drops the old one
      ...clean(
        {
          ...current,
          ...(fields.countryCode && fields.countryCode !== current.countryCode
            ? {
                regionCode: null,
                region: null,
              }
            : {}),
          ...fields,
        },
        rules,
      ),
    };
  }

  delete(now: Date): void {
    this.props.deletedAt = now.toISOString();
    this.props.isDefault = false;
  }

  // The copy stored on an order
  toShippingAddress(): AddressFields {
    const {
      id: _,
      userId: _u,
      isDefault: _d,
      deletedAt: _x,
      ...fields
    } = this.props;
    return fields;
  }

  assignId(id: bigint): void {
    this.props.id = id;
  }

  snapshot(): Readonly<AddressProps> {
    return this.props;
  }
}
