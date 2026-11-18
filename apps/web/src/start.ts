import { createMiddleware, createStart } from "@tanstack/react-start";
import { withBase } from "@/lib/url";

// The base path ('/monokit'; '' at the root)
const BASE_PATH = withBase("");

// Forwards the api's routes on this origin to the api (API_URL), so the
// browser's same-origin /api calls and HttpOnly cookies work in production
// as they do behind the dev server's proxy (vite.config.ts), which answers
// first in dev. /socket.io works over HTTP long-polling here; put nginx (or
// another proxy that passes websockets) in front for the websocket upgrade.
const PROXIED = /^\/(api|serve|assets|storage|socket\.io)(\/|$)/;

const apiProxy = createMiddleware().server(async ({ request, next }) => {
  const url = new URL(request.url);
  // Requests arrive under the base path; the api routes sit below it
  const local =
    BASE_PATH && url.pathname.startsWith(`${BASE_PATH}/`)
      ? url.pathname.slice(BASE_PATH.length)
      : url.pathname;
  const match = PROXIED.exec(local);
  if (!match) {
    return next();
  }
  const origin = (
    process.env.API_URL ?? `http://localhost:${process.env.API_PORT ?? 3000}`
  ).replace(/\/+$/, "");
  const prefix = (process.env.API_PREFIX ?? "")
    .replace(/^\/*/, "/")
    .replace(/\/+$/, "");
  // /api/users -> {prefix}/users; the socket is unprefixed on the api
  const path =
    match[1] === "api"
      ? `${prefix}${local.slice("/api".length)}`
      : match[1] === "socket.io"
        ? local
        : `${prefix}${local}`;
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.slice(0, -1));
  // The visitor's address for the api's rate limits (TRUST_PROXY); srvx sets
  // request.ip to the peer
  const ip = (
    request as Request & {
      ip?: string;
    }
  ).ip;
  if (ip) {
    const prior = headers.get("x-forwarded-for");
    headers.set("x-forwarded-for", prior ? `${prior}, ${ip}` : ip);
  }
  const res = await fetch(`${origin}${path}${url.search}`, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : request.body,
    redirect: "manual",
    // Streams the request body (uploads)
    duplex: "half",
  } as RequestInit);
  const out = new Headers(res.headers);
  // fetch already decoded the body
  out.delete("content-encoding");
  out.delete("content-length");
  // The refresh cookie's path (/auth under the api prefix) moves under /api,
  // so browsers send it to this origin
  if (prefix !== withBase("/api")) {
    out.delete("set-cookie");
    for (const cookie of res.headers.getSetCookie()) {
      out.append(
        "set-cookie",
        cookie.replace(/;\s*Path=([^;]*)/i, (whole, p: string) =>
          p.startsWith(`${prefix}/`) || p === prefix
            ? `; Path=${withBase("/api")}${p.slice(prefix.length)}`
            : whole,
        ),
      );
    }
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: out,
  });
});

export const startInstance = createStart(() => ({
  requestMiddleware: [
    apiProxy,
  ],
}));
