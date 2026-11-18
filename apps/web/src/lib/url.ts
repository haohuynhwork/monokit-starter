// The web app's base path ('/monokit'; '' at the root): the path of
// PUBLIC_WEB_URL, fixed at build time as Vite's `base` (vite.config.ts).
// Everything the browser requests from this origin sits under it.
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/+$/, "");

// '/serve/a.png' -> '/monokit/serve/a.png'
export const withBase = (path: string): string => `${BASE_PATH}${path}`;

// Api file URLs (avatarUrl, asset url, coverUrl) come ready to use; these
// are for the web app's own static files.

// "plugin/tinymce" -> "/monokit/plugin/tinymce"
export function assetUrl(path: string): string {
  return withBase(`/${path.replace(/^\/+/, "")}`);
}

// "plugin/tinymce" -> "https://example.com/monokit/plugin/tinymce". For
// third-party code that needs absolute URLs (TinyMCE's document_base_url).
export function absoluteUrl(path: string): string {
  return `${window.location.origin}${assetUrl(path)}`;
}

// The link's name in the media library: the URL's last segment
export function linkName(url: string): string {
  const { hostname, pathname } = new URL(url);
  let last = pathname.split("/").filter(Boolean).pop() ?? "";
  try {
    last = decodeURIComponent(last);
  } catch {
    // Keep it encoded
  }
  return (last || hostname).slice(0, 255);
}
