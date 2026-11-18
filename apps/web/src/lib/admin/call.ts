import type { ResponseEnvelope } from "@packages/contracts";
import { api, type FormState } from "@/lib/api";

// A fail as a form shows it, for nested bodies: issues keyed by the top-level
// path segment (name, slug), the full path (variants.0.listPrice), and for
// lists "<list>.<index>" (variants.0); a domain code mapped to its field
export function failState(
  res: ResponseEnvelope<unknown>,
  codeFields?: Record<string, string>,
): FormState {
  const issues =
    (
      res.data as
        | {
            issues?: {
              path?: string;
              message: string;
            }[];
          }
        | undefined
    )?.issues ?? [];
  const message = issues[0]?.message ?? res.message ?? "Something went wrong.";
  const fieldErrors: Record<string, string> = {};
  for (const i of issues) {
    const [top, index] = (i.path ?? "").split(".");
    if (!top) {
      continue;
    }
    fieldErrors[top] ??= i.message;
    if (i.path && i.path !== top) {
      fieldErrors[i.path] ??= i.message;
    }
    if (index !== undefined && /^\d+$/.test(index)) {
      fieldErrors[`${top}.${index}`] ??= i.message;
    }
  }
  const codeField = res.code ? codeFields?.[res.code] : undefined;
  if (codeField) {
    fieldErrors[codeField] ??= message;
  }
  // message stays for callers that only toast it; forms show fieldErrors
  // under their inputs and the banner only without them
  return Object.keys(fieldErrors).length
    ? {
        message,
        fieldErrors,
      }
    : {
        message,
      };
}

// A write from a form or button (the web panel's shopCall): a fail becomes a
// message and field errors, a success `done` plus the response data. Nothing
// is reloaded here; callers run `router.invalidate()` after a success.
export async function call<T = unknown>(
  path: string,
  init: {
    method: string;
    // JSON, or FormData sent as multipart
    body?: unknown;
  },
  done: string,
  // Domain error code -> the field it belongs to, e.g. sku_taken -> sku
  codeFields?: Record<string, string>,
): Promise<
  FormState & {
    data?: T;
  }
> {
  const res = await api<T>(path, init);
  if (res.status !== "success") {
    return failState(res, codeFields);
  }
  return {
    ok: true,
    message: done,
    data: res.data,
  };
}
