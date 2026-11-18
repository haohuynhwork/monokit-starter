import { api, type FormState } from "@/lib/api";

export type GeoFormState = FormState & {
  // Shown under the input they belong to (code, name, rate...)
  fieldErrors?: Record<string, string>;
};

// The domain's invalid_geo_input has one code for every field; its message
// says which one
const MESSAGE_FIELDS: [
  RegExp,
  string,
][] = [
  [
    /^(currency |locale |region )?code/i,
    "code",
  ],
  [
    /^name/i,
    "name",
  ],
  [
    /^rate/i,
    "rate",
  ],
  [
    /^decimals/i,
    "decimals",
  ],
  [
    /^symbol/i,
    "symbol",
  ],
  [
    /^country/i,
    "countryCode",
  ],
  [
    /parent region/i,
    "parentId",
  ],
];

const CODE_FIELDS: Record<string, string> = {
  currency_code_taken: "code",
  locale_code_taken: "code",
  region_code_taken: "code",
  region_cycle: "parentId",
};

// call(), but validation issues and field-specific domain errors come back
// as fieldErrors (no message then). Callers run router.invalidate() after a
// success.
export async function geoCall(
  path: string,
  init: {
    method: string;
    body?: unknown;
  },
  done: string,
): Promise<GeoFormState> {
  const res = await api(path, init);
  if (res.status !== "success") {
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
    const fieldErrors: Record<string, string> = {};
    for (const i of issues) {
      fieldErrors[i.path.split(".")[0]] ??= i.message;
    }
    const message = res.message ?? "Something went wrong.";
    const byCode = res.code ? CODE_FIELDS[res.code] : undefined;
    const byMessage =
      res.code === "invalid_geo_input"
        ? MESSAGE_FIELDS.find(([re]) => re.test(message))?.[1]
        : undefined;
    const name = byCode ?? byMessage;
    if (name) {
      fieldErrors[name] ??= message;
    }
    return Object.keys(fieldErrors).length
      ? {
          fieldErrors,
        }
      : {
          message,
        };
  }
  return {
    ok: true,
    message: done,
  };
}

// Pre-checks shared by the geo forms
export function checkName(
  fieldErrors: Record<string, string>,
  name: string,
  max: number,
) {
  if (!name) {
    fieldErrors.name = "Enter a name.";
  } else if (name.length > max) {
    fieldErrors.name = `Use at most ${max} characters.`;
  }
}

export function checkPosition(
  fieldErrors: Record<string, string>,
  position: string,
) {
  if (position && !/^\d{1,6}$/.test(position)) {
    fieldErrors.position = "A whole number from 0.";
  } else if (Number(position) > 100000) {
    fieldErrors.position = "At most 100000.";
  }
}
