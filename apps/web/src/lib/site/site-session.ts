import { api, type FormState, toFormState } from "@/lib/api";
import { withBase } from "@/lib/url";
import { forgetSession } from "./shop-client";

// The base path ('/monokit'; '' at the root)
const BASE_PATH = withBase("");

// Client helpers for the public site's customer session. It is the admin's
// session: the api sets HttpOnly cookies on login / register and clears them
// on logout, and the browser sends them with every same-origin api() call.

export { fetchMe, isStaff } from "@/lib/auth";

const DEFAULT_AFTER_SIGN_IN = "/account";

// A `redirect` search param as a full href on this site (base path
// included); anything that isn't a path on this app falls back to /account
export function redirectHref(target: string | undefined): string {
  const path =
    target?.startsWith("/") && !target.startsWith("//")
      ? target
      : DEFAULT_AFTER_SIGN_IN;
  if (
    BASE_PATH &&
    (path === BASE_PATH ||
      path.startsWith(`${BASE_PATH}/`) ||
      path.startsWith(`${BASE_PATH}?`))
  ) {
    return path;
  }
  return withBase(path);
}

// Goes to a `redirect` target (after signing in)
export function goTo(
  router: {
    history: {
      push: (href: string) => void;
    };
  },
  target: string | undefined,
) {
  router.history.push(redirectHref(target));
}

// A `redirect` search value from the router, or undefined
export const redirectParam = (v: unknown): string | undefined =>
  typeof v === "string" && v.startsWith("/") && !v.startsWith("//")
    ? v
    : undefined;

export type AuthResult = FormState & {
  // Shown as a status message, not an error
  notice?: string;
};

// POST /auth/login; cookies are set on success (ok: true)
export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const res = await api("/auth/login", {
    method: "POST",
    body: {
      email,
      password,
    },
    silent: true,
  });
  forgetSession();
  return toFormState(res, "");
}

// POST /auth/register; signs the new customer in
export async function register(values: {
  email: string;
  displayName: string;
  password: string;
}): Promise<AuthResult> {
  const res = await api("/auth/register", {
    method: "POST",
    body: values,
    silent: true,
  });
  forgetSession();
  return toFormState(res, "");
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const res = await api("/auth/password/forgot", {
    method: "POST",
    body: {
      email,
    },
    silent: true,
  });
  return toFormState(res, "");
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<AuthResult> {
  const res = await api("/auth/password/reset", {
    method: "POST",
    body: {
      token,
      password,
      // Mail "your password was changed"
      notify: true,
    },
    silent: true,
  });
  return toFormState(res, "");
}

// Clears the auth cookies
export async function logout(): Promise<void> {
  await api("/auth/logout", {
    method: "POST",
    silent: true,
  });
  forgetSession();
}
