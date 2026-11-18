// PUBLIC_WEB_URL: the web app's public URL with its base path, e.g.
// "https://example.com/my-cms", or just "/my-cms" without an origin. The
// same value the web is built with.
const [, WEB_ORIGIN = "", path = ""] =
  /^(https?:\/\/[^/]+)?(.*)$/.exec((process.env.PUBLIC_WEB_URL ?? "").trim()) ??
  [];

// The base path ("/my-cms"; "" at the root). Browsers reach the api's /serve,
// /assets and /storage through the web app, so URLs handed out must carry it.
export const WEB_BASE_PATH = path.replace(/\/+$/, "");

// The web app's URL for links in emails, e.g. https://example.com/my-cms;
// null without an origin
export const webUrl = (): string | null =>
  WEB_ORIGIN ? `${WEB_ORIGIN}${WEB_BASE_PATH}` : null;

// '/serve/a.png' -> '/my-cms/serve/a.png'
export const webPath = (path: string): string => `${WEB_BASE_PATH}${path}`;
