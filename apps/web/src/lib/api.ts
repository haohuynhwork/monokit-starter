import type { ResponseEnvelope } from "@packages/contracts";
import { withBase } from "./url";

// Same-origin /api (proxied to the api, see vite.config.ts). The api reads
// its HttpOnly access_token cookie, so page scripts never see a token.
const BASE = withBase("/api");

// Called when the session is gone for good (refresh failed); the router
// sends the user to /login
let onSignedOut: () => void = () => {};
export const setOnSignedOut = (fn: () => void) => {
  onSignedOut = fn;
};

async function send<T>(
  path: string,
  init: {
    method?: string;
    body?: unknown;
  },
): Promise<ResponseEnvelope<T>> {
  // FormData (file uploads) goes as multipart; fetch sets its boundary
  const isForm = init.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method ?? "GET",
      credentials: "same-origin",
      headers:
        init.body === undefined || isForm
          ? undefined
          : {
              "Content-Type": "application/json",
            },
      body:
        init.body === undefined
          ? undefined
          : isForm
            ? (init.body as FormData)
            : JSON.stringify(init.body),
    });
  } catch {
    return {
      status: "error",
      code: "api_unreachable",
      message: "The server is unreachable. Try again later.",
    };
  }
  // 204 has no body
  if (res.status === 204) {
    return {
      status: "success",
    };
  }
  try {
    return (await res.json()) as ResponseEnvelope<T>;
  } catch {
    return {
      status: "error",
      code: "bad_response",
      message: "Unexpected response from the server.",
    };
  }
}

// One shared refresh while several calls hit an expired access token
let refreshing: Promise<boolean> | null = null;
const refresh = () => {
  refreshing ??= send("/auth/refresh", {
    method: "POST",
    body: {},
  })
    .then((r) => r.status === "success")
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
};

// An api call; an expired access token is refreshed (refresh_token cookie)
// and the call retried once
export async function api<T>(
  path: string,
  init: {
    method?: string;
    // JSON, or FormData sent as multipart
    body?: unknown;
    // Don't go to /login when signed out (the caller handles it)
    silent?: boolean;
  } = {},
): Promise<ResponseEnvelope<T>> {
  const res = await send<T>(path, init);
  if (res.status === "fail" && res.code === "invalid_token") {
    if (await refresh()) {
      return send<T>(path, init);
    }
    if (!init.silent) {
      onSignedOut();
    }
  }
  return res;
}

// A fail as a form shows it: field errors keyed by the api issue's top-level
// path segment, plus a domain code mapped to its field (slug_taken -> slug)
export type FormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export function toFormState(
  res: ResponseEnvelope<unknown>,
  done: string,
  codeFields?: Record<string, string>,
): FormState {
  if (res.status === "success") {
    return {
      ok: true,
      message: done,
    };
  }
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
    const top = (i.path ?? "").split(".")[0];
    if (top) {
      fieldErrors[top] ??= i.message;
    }
  }
  const codeField = res.code ? codeFields?.[res.code] : undefined;
  if (codeField) {
    fieldErrors[codeField] ??= message;
  }
  return Object.keys(fieldErrors).length
    ? {
        message,
        fieldErrors,
      }
    : {
        message,
      };
}

// Response shapes live in types.ts; re-exported for older imports
export type { Category, User } from "./types";
