// Known settings (ideas/configs). A missing row means the default; unknown
// keys are refused. `public` keys reach anyone via GET /configs/public.

import {
  bool,
  type Check,
  type CheckResult,
  int,
  no,
  nullable,
  ok,
  text,
} from "../../common/domain/checks.js";

export type { CheckResult };

interface KeySpec<T> {
  default: T;
  public: boolean;
  label: string;
  check: Check<T>;
  // Fields never sent back to the panel; a key with any is stored encrypted
  secret?: readonly string[];
}

const currency: Check<string> = (v) =>
  typeof v === "string" && /^[A-Za-z]{3}$/.test(v)
    ? ok(v.toUpperCase())
    : no("must be a 3-letter ISO 4217 code, e.g. USD");

// Format and duplicates only; whether each code is a real country is checked
// by SetConfigHandler (the country list lives in @packages/geo)
const countryCodes: Check<string[]> = (v) => {
  if (!Array.isArray(v) || v.some((c) => typeof c !== "string")) {
    return no("must be a list of country codes");
  }
  const codes = (v as string[]).map((c) => c.trim().toUpperCase());
  if (codes.some((c) => !/^[A-Z]{2}$/.test(c))) {
    return no("must be 2-letter ISO 3166-1 codes, e.g. VN");
  }
  if (new Set(codes).size !== codes.length) {
    return no("has duplicates");
  }
  return codes.length === 0
    ? no("needs at least one country (or reset to allow all)")
    : ok(codes);
};

// Outgoing email, one record so the fields change together. `driver` picks
// how mail leaves; each driver has its own fields. Secret fields (`password`,
// `apiKey`) left empty keep the stored ones (see parseConfig).
interface MailFrom {
  fromName: string;
  fromEmail: string;
}

// `secure`: TLS from the first byte (usually port 465); false upgrades with
// STARTTLS when the server offers it (587)
export interface SmtpMail extends MailFrom {
  driver: "smtp";
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

// resend.com over HTTPS, for hosts that block SMTP ports
export interface ResendMail extends MailFrom {
  driver: "resend";
  apiKey: string;
}

// Writes each email to the api log instead of sending it (development)
export interface LogMail extends MailFrom {
  driver: "log";
}

export type MailSettings = SmtpMail | ResendMail | LogMail;
export const MAIL_DRIVERS = [
  "smtp",
  "resend",
  "log",
] as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const secretText: Check<string> = (v) =>
  typeof v === "string" && v.length <= 1000 ? ok(v) : no("must be text");

// Runs each field's check; the first refusal names its field
function fields<T>(
  o: Record<string, unknown>,
  checks: Record<string, Check<unknown>>,
): CheckResult<T> {
  const out: Record<string, unknown> = {};
  for (const [name, check] of Object.entries(checks)) {
    const r = check(o[name]);
    if (!r.ok) {
      return no(`${name} ${r.reason}`);
    }
    out[name] = r.value;
  }
  return ok(out as T);
}

const optionalText =
  (max: number): Check<string> =>
  (v) =>
    text(max)(v ?? "");

const mail: Check<MailSettings> = (v) => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    return no("must be an object");
  }
  const o = v as Record<string, unknown>;
  const from = {
    fromName: optionalText(100),
    fromEmail: text(255),
  };
  let r: CheckResult<MailSettings>;
  switch (o.driver) {
    case "smtp":
      r = fields<MailSettings>(o, {
        host: text(255),
        port: int(1, 65_535),
        secure: bool,
        username: optionalText(255),
        password: (p) => secretText(p ?? ""),
        ...from,
      });
      break;
    case "resend":
      r = fields<MailSettings>(o, {
        apiKey: (k) => secretText(k ?? ""),
        ...from,
      });
      break;
    case "log":
      r = fields<MailSettings>(o, from);
      break;
    default:
      return no(`driver must be one of: ${MAIL_DRIVERS.join(", ")}`);
  }
  if (!r.ok) {
    return r;
  }
  // fields() keeps only the checked names; put the tag back
  const value = {
    ...r.value,
    driver: o.driver,
  } as MailSettings;
  if (!EMAIL.test(value.fromEmail)) {
    return no("fromEmail must be an email address");
  }
  if (value.driver === "smtp") {
    if (value.host === "") {
      return no("host is required");
    }
    if (value.password !== "" && value.username === "") {
      return no("username is required with a password");
    }
  }
  return ok(value);
};

const MONEY_MAX = 1_000_000_000_000;

export const CONFIG_KEYS = {
  "site.name": {
    default: "My CMS",
    public: true,
    label: "Site name",
    check: (v) => {
      const r = text(100)(v);
      return r.ok && r.value === "" ? no("is required") : r;
    },
  } as KeySpec<string>,
  "site.description": {
    default: "",
    public: true,
    label: "Site description",
    check: text(500),
  } as KeySpec<string>,
  "shop.currency": {
    default: "USD",
    public: true,
    label: "Currency",
    check: currency,
  } as KeySpec<string>,
  "shop.taxRateBps": {
    default: 0,
    public: true,
    label: "Tax rate (basis points, 100 = 1%)",
    check: int(0, 10_000),
  } as KeySpec<number>,
  "shipping.flatFee": {
    default: 0,
    public: true,
    label: "Shipping fee (minor units)",
    check: int(0, MONEY_MAX),
  } as KeySpec<number>,
  "shipping.freeOver": {
    default: null,
    public: true,
    label: "Free shipping from subtotal (minor units)",
    check: nullable(int(0, MONEY_MAX)),
  } as KeySpec<number | null>,
  // NULL: ship anywhere
  "shipping.countries": {
    default: null,
    public: true,
    label: "Ship to countries",
    check: nullable(countryCodes),
  } as KeySpec<string[] | null>,
  "orders.autoCancelHours": {
    default: null,
    public: false,
    label: "Cancel unpaid orders after (hours)",
    check: nullable(int(1, 24 * 365)),
  } as KeySpec<number | null>,
  // NULL: email is off
  mail: {
    default: null,
    public: false,
    label: "Outgoing email",
    check: nullable(mail),
    secret: [
      "password",
      "apiKey",
    ],
  } as KeySpec<MailSettings | null>,
} as const;

// Every value is JSON: text, whole numbers, lists of text, records and null
export type ConfigValue = string | number | string[] | MailSettings | null;

export type ConfigKey = keyof typeof CONFIG_KEYS;
export type ConfigValues = {
  [K in ConfigKey]: (typeof CONFIG_KEYS)[K]["default"];
};

export function isConfigKey(key: string): key is ConfigKey {
  return Object.hasOwn(CONFIG_KEYS, key);
}

export function secretFields(key: ConfigKey): readonly string[] {
  return (CONFIG_KEYS[key] as KeySpec<unknown>).secret ?? [];
}

export function defaults(): ConfigValues {
  return Object.fromEntries(
    Object.entries(CONFIG_KEYS).map(([k, s]) => [
      k,
      s.default,
    ]),
  ) as ConfigValues;
}
