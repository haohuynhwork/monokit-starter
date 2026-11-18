import type { CookieOptions, Request, Response } from "express";
import { API_PREFIX } from "../../common/http/setup/api-prefix.js";
import type { TokenPair } from "../domain/tokens.js";

// For the browser admin: tokens in HttpOnly cookies, so page scripts can't
// read them. SameSite=Lax keeps them off cross-site POSTs (CSRF).
export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

const base = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
});

// The refresh token only travels to /auth (refresh, logout)
const ACCESS_PATH = "/";
const REFRESH_PATH = `${API_PREFIX}/auth`;

export function setAuthCookies(res: Response, tokens: TokenPair): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...base(),
    path: ACCESS_PATH,
    maxAge: tokens.expiresIn * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base(),
    path: REFRESH_PATH,
    maxAge: tokens.refreshExpiresIn * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, {
    ...base(),
    path: ACCESS_PATH,
  });
  res.clearCookie(REFRESH_COOKIE, {
    ...base(),
    path: REFRESH_PATH,
  });
}

export function readCookie(req: Request, name: string): string | undefined {
  const value: unknown = (req.cookies as Record<string, unknown> | undefined)?.[
    name
  ];
  return typeof value === "string" && value ? value : undefined;
}
