import { Injectable } from "@nestjs/common";
import sanitizeHtml from "sanitize-html";
import { ASSET_KEY, type HtmlSanitizer, isAssetRef } from "../domain/html.js";
import { WEB_BASE_PATH } from "./web-path.js";

// Our own public files, with or without the web base path (older bodies)
const OWN_FILE = new RegExp(
  `^(${WEB_BASE_PATH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})?/files/`,
);

// Our own public files, or https elsewhere (images, video, audio)
const isAllowedMedia = (src: string | undefined) =>
  OWN_FILE.test(src ?? "") ||
  isAssetRef(src ?? "") ||
  (src ?? "").startsWith("https://");

// Embeds (TinyMCE's media plugin) only from these hosts
const IFRAME_HOSTS = [
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "www.google.com",
  "maps.google.com",
];

// CSS values the full editor writes (colors, fonts, sizes, spacing, table
// borders), and nothing that can load or position things: no url(),
// expression(), position or z-index
const COLOR =
  /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\)|[a-z]+)$/i;
const LENGTH = /^(0|-?\d*\.?\d+(px|pt|em|rem|%|vw|vh|ch|ex)?|auto)$/i;
const LENGTHS = /^((0|-?\d*\.?\d+(px|pt|em|rem|%)?|auto)\s*){1,4}$/i;
const BORDER =
  /^(\d*\.?\d+(px|pt|em)?\s+)?(none|solid|dashed|dotted|double|groove|ridge|inset|outset|hidden)(\s+(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+))?$/i;
const STYLES: Record<string, RegExp[]> = {
  "text-align": [
    /^(left|right|center|justify|start|end)$/,
  ],
  color: [
    COLOR,
  ],
  "background-color": [
    COLOR,
  ],
  "font-size": [
    LENGTH,
    /^(xx-small|x-small|small|medium|large|x-large|xx-large)$/,
  ],
  "font-family": [
    /^[\w\s,'"-]+$/,
  ],
  "font-weight": [
    /^(normal|bold|bolder|lighter|\d{3})$/,
  ],
  "font-style": [
    /^(normal|italic|oblique)$/,
  ],
  "line-height": [
    /^(normal|\d*\.?\d+(px|pt|em|rem|%)?)$/,
  ],
  "text-decoration": [
    /^(none|underline|line-through|overline)(\s+(underline|line-through|overline))*$/,
  ],
  "text-indent": [
    LENGTH,
  ],
  "vertical-align": [
    /^(top|middle|bottom|baseline|sub|super|text-top|text-bottom)$/,
  ],
  "list-style-type": [
    /^[a-z-]+$/,
  ],
  "white-space": [
    /^(normal|nowrap|pre|pre-wrap|pre-line)$/,
  ],
  "padding-left": [
    LENGTH,
  ],
  "padding-right": [
    LENGTH,
  ],
  padding: [
    LENGTHS,
  ],
  margin: [
    LENGTHS,
  ],
  "margin-left": [
    LENGTH,
  ],
  "margin-right": [
    LENGTH,
  ],
  "margin-top": [
    LENGTH,
  ],
  "margin-bottom": [
    LENGTH,
  ],
  float: [
    /^(left|right|none)$/,
  ],
  display: [
    /^(block|inline|inline-block|table|none)$/,
  ],
  width: [
    LENGTH,
  ],
  height: [
    LENGTH,
  ],
  "max-width": [
    LENGTH,
  ],
  "border-collapse": [
    /^(collapse|separate)$/,
  ],
  "border-spacing": [
    LENGTHS,
  ],
  border: [
    BORDER,
    /^0$/,
  ],
  "border-top": [
    BORDER,
  ],
  "border-right": [
    BORDER,
  ],
  "border-bottom": [
    BORDER,
  ],
  "border-left": [
    BORDER,
  ],
  "border-width": [
    LENGTHS,
  ],
  "border-style": [
    /^[a-z\s]+$/,
  ],
  "border-color": [
    COLOR,
  ],
  "aspect-ratio": [
    /^\d+\s*\/\s*\d+$/,
  ],
};

// Everything the full TinyMCE toolbar produces for posts and products, but
// nothing that runs: no scripts, event handlers, javascript: URLs, unknown
// iframes or styles that load or position things. Bodies are rendered on
// public pages and in the panel, so this is the XSS boundary.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "hr",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "pre",
    "code",
    "span",
    "div",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "del",
    "ins",
    "sub",
    "sup",
    "mark",
    "small",
    "abbr",
    "cite",
    "q",
    "kbd",
    "time",
    "a",
    "ul",
    "ol",
    "li",
    "dl",
    "dt",
    "dd",
    "img",
    "figure",
    "figcaption",
    "table",
    "caption",
    "colgroup",
    "col",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "details",
    "summary",
    "iframe",
    "video",
    "audio",
    "source",
  ],
  allowedAttributes: {
    a: [
      "href",
      "title",
      "target",
      "rel",
      "name",
    ],
    img: [
      "src",
      "alt",
      "title",
      "width",
      "height",
      "loading",
    ],
    table: [
      "border",
      "cellpadding",
      "cellspacing",
      "width",
      "summary",
    ],
    th: [
      "colspan",
      "rowspan",
      "scope",
      "width",
      "height",
    ],
    td: [
      "colspan",
      "rowspan",
      "width",
      "height",
    ],
    col: [
      "span",
      "width",
    ],
    ol: [
      "start",
      "reversed",
      "type",
    ],
    li: [
      "value",
    ],
    time: [
      "datetime",
    ],
    abbr: [
      "title",
    ],
    q: [
      "cite",
    ],
    blockquote: [
      "cite",
    ],
    details: [
      "open",
    ],
    iframe: [
      "src",
      "width",
      "height",
      "title",
      "allow",
      "allowfullscreen",
      "loading",
      "referrerpolicy",
      "frameborder",
      // Always set by transformTags below
      "sandbox",
    ],
    video: [
      "src",
      "width",
      "height",
      "poster",
      "controls",
      "loop",
      "muted",
      "playsinline",
      "preload",
    ],
    audio: [
      "src",
      "controls",
      "loop",
      "muted",
      "preload",
    ],
    source: [
      "src",
      "type",
    ],
    "*": [
      "style",
      "id",
      "class",
      "dir",
      "lang",
      "title",
    ],
  },
  allowedStyles: {
    "*": STYLES,
  },
  allowedSchemes: [
    "http",
    "https",
    "mailto",
    "tel",
  ],
  allowedSchemesByTag: {
    img: [
      "https",
    ],
    video: [
      "https",
    ],
    audio: [
      "https",
    ],
    source: [
      "https",
    ],
    iframe: [
      "https",
    ],
  },
  selfClosing: [
    ...sanitizeHtml.defaults.selfClosing,
    "source",
  ],
  allowProtocolRelative: false,
  allowedIframeHostnames: IFRAME_HOSTS,
  allowIframeRelativeUrls: false,
  transformTags: {
    // New tabs must not get access to this page
    a: (tagName, attribs) => ({
      tagName,
      attribs:
        attribs.target === "_blank"
          ? {
              ...attribs,
              rel: "noopener noreferrer",
            }
          : attribs,
    }),
    // Embeds run sandboxed: their own scripts, never this page's
    iframe: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        sandbox:
          "allow-scripts allow-same-origin allow-presentation allow-popups",
        loading: "lazy",
      },
    }),
  },
  // Media: our own public files or https elsewhere
  exclusiveFilter: (frame) =>
    (frame.tag === "img" && !isAllowedMedia(frame.attribs.src)) ||
    ((frame.tag === "video" || frame.tag === "audio") &&
      frame.attribs.src !== undefined &&
      !isAllowedMedia(frame.attribs.src)) ||
    (frame.tag === "source" && !isAllowedMedia(frame.attribs.src)) ||
    // Its src was refused (unknown host): drop the empty frame too
    (frame.tag === "iframe" && !frame.attribs.src),
};

// Responses carry file URLs (ResolveContentUrlsQuery), so bodies come back
// from the editor with them: store references again, free of the base path
// and the backend. '[base]/serve/<key>' (the local backend's URL) and the
// older '[base]/files/<key>', '[base]/assets/<key>' -> 'serve/<key>'.
const BASE = WEB_BASE_PATH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const OWN_URL = new RegExp(
  `\\b(src|href)="(?:${BASE})?/(?:files|assets|serve)/([^"?#/]+)"`,
  "g",
);

function toAssetRefs(html: string): string {
  return html.replace(OWN_URL, (whole, attr: string, key: string) =>
    ASSET_KEY.test(key) ? `${attr}="serve/${key}"` : whole,
  );
}

@Injectable()
export class SanitizeHtmlSanitizer implements HtmlSanitizer {
  sanitize(html: string): string {
    return sanitizeHtml(toAssetRefs(html), OPTIONS);
  }
}
