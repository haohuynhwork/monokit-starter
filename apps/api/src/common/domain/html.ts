// Rich-text bodies (posts, products), shared by the contexts that have them

// Allowlist HTML cleaning for bodies coming from the rich-text editor
export interface HtmlSanitizer {
  sanitize(html: string): string;
}

export const HTML_SANITIZER = Symbol("HTML_SANITIZER");

// '[/base-path]/files/<key>' URLs of images in older bodies (saving turns
// them into 'serve/<key>'): also 'inline' asset usages
export function inlineFileKeys(html: string): string[] {
  const keys = new Set<string>();
  for (const m of html.matchAll(/\bsrc="(?:\/[^"/]+)*?\/files\/([^"?#]+)"/g)) {
    keys.add(m[1]!);
  }
  return [
    ...keys,
  ];
}

// An asset's public key (Asset.key, not the storage key): '<uuid>.<ext>'
// for files (see UploadAssetHandler), '<uuid>' for directories and links
export const ASSET_KEY =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-z0-9]+)?$/;

// How rich text references a library file or link: 'serve/<key>' (what the
// media picker inserts). Relative, so it resolves against the site's base
// URL, where /serve/<key> serves it; the api replaces it with the file's
// URL in public responses.
export const isAssetRef = (url: string): boolean =>
  url.startsWith("serve/") && ASSET_KEY.test(url.slice("serve/".length));

// src="serve/..." / href="serve/..." in a body: [whole, attr, url]
export const ASSET_REF_ATTR = /\b(src|href)="(serve\/[^"?#]+)"/g;

// Keys of the assets a body references: also 'inline' asset usages
export function inlineAssetKeys(html: string): string[] {
  const keys = new Set<string>();
  for (const m of html.matchAll(ASSET_REF_ATTR)) {
    if (isAssetRef(m[2]!)) {
      keys.add(m[2]!.slice("serve/".length));
    }
  }
  return [
    ...keys,
  ];
}
