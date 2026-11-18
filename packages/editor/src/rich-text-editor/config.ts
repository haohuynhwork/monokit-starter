import { editorHost } from "../host";

// Built-in TinyMCE plugins (served from /plugin/tinymce). What they produce
// must survive the api's HTML sanitizer (common/infrastructure/
// sanitize-html.sanitizer.ts); widen both together. 'code' and 'save' are
// left out: `codeview` is our source view, and forms save themselves.
export const PLUGINS = [
  "accordion",
  "advlist",
  "anchor",
  "autolink",
  "autosave",
  "charmap",
  "codesample",
  "directionality",
  "emoticons",
  "fullscreen",
  "help",
  "image",
  "insertdatetime",
  "link",
  "lists",
  "media",
  "nonbreaking",
  "pagebreak",
  "quickbars",
  "searchreplace",
  "table",
  "visualblocks",
  "visualchars",
  "wordcount",
];

export const MENUBAR = "edit view insert format tools table help";

// oc-shield's order, minus its demo buttons (abcd, myplugin), 'code'
// (our `codeview`, plugins/code-view/, takes its place) and 'save';
// `custompreview` (plugins/custom-preview/, Handlebars) replaces
// TinyMCE's preview. Blockquote kept from ours.
export const TOOLBAR =
  "codeview custompreview | undo redo | accordion accordionremove | " +
  "blocks fontfamily fontsize | bold italic underline strikethrough | " +
  "align numlist bullist | link image | table media | " +
  "lineheight outdent indent | forecolor backcolor removeformat | " +
  "charmap emoticons | fullscreen print | " +
  "pagebreak anchor codesample blockquote | ltr rtl";

// --- Variants ---------------------------------------------------------
// Every variant is the full editor above minus what it excludes, so new
// features land everywhere unless a variant opts out.

export type EditorVariant = "full" | "standard" | "basic" | "minimal";

export interface VariantExclude {
  // Hide the menubar (Edit, Insert, Format, ...)
  menubar?: boolean;
  // Hide the status bar (element path, word count)
  statusbar?: boolean;
  // Plugins to leave out; their toolbar buttons go with them
  plugins?: string[];
  // Toolbar buttons to leave out (core ones too, e.g. "fontsize")
  buttons?: string[];
}

export const VARIANT_EXCLUDES: Record<EditorVariant, VariantExclude> = {
  // Staff: everything
  full: {},
  // Everything but the menubar
  standard: {
    menubar: true,
  },
  // Reviews, comments: text with structure, no layout or styling
  basic: {
    menubar: true,
    plugins: [
      "accordion",
      "anchor",
      // "directionality",
      "fullscreen",
      // "image",
      "insertdatetime",
      // "media",
      "pagebreak",
      // "preview",
      "table",
      // "visualblocks",
      // "visualchars",
    ],
    buttons: [
      // "codeview",
      "fontfamily",
      "fontsize",
      "forecolor",
      "backcolor",
      // "lineheight",
      // "outdent",
      // "indent",
      "print",
    ],
  },
  // A short note: bold, italic, lists and links
  minimal: {
    menubar: true,
    statusbar: true,
    plugins: [
      "accordion",
      "anchor",
      "autosave",
      "charmap",
      "codesample",
      "directionality",
      "emoticons",
      "fullscreen",
      "help",
      "image",
      "insertdatetime",
      "media",
      "nonbreaking",
      "pagebreak",
      "preview",
      "quickbars",
      "searchreplace",
      "table",
      "visualblocks",
      "visualchars",
      "wordcount",
    ],
    buttons: [
      "codeview",
      "blocks",
      "fontfamily",
      "fontsize",
      "strikethrough",
      "align",
      "lineheight",
      "outdent",
      "indent",
      "forecolor",
      "backcolor",
      "print",
      "blockquote",
    ],
  },
};

// The toolbar buttons each plugin adds, so excluding a plugin drops them
const PLUGIN_BUTTONS: Record<string, string[]> = {
  accordion: [
    "accordion",
    "accordionremove",
  ],
  advlist: [],
  anchor: [
    "anchor",
  ],
  charmap: [
    "charmap",
  ],
  codesample: [
    "codesample",
  ],
  directionality: [
    "ltr",
    "rtl",
  ],
  emoticons: [
    "emoticons",
  ],
  fullscreen: [
    "fullscreen",
  ],
  image: [
    "image",
  ],
  insertdatetime: [
    "insertdatetime",
  ],
  link: [
    "link",
  ],
  lists: [
    "numlist",
    "bullist",
  ],
  media: [
    "media",
  ],
  pagebreak: [
    "pagebreak",
  ],
  // Not a loaded plugin any more: our custompreview replaced it, and
  // excluding "preview" in a variant drops that button
  preview: [
    "custompreview",
  ],
  searchreplace: [
    "searchreplace",
  ],
  table: [
    "table",
  ],
  visualblocks: [
    "visualblocks",
  ],
};

// The plugins, toolbar and bars of a variant
export function variantConfig(variant: EditorVariant) {
  const exclude = VARIANT_EXCLUDES[variant];
  const plugins = PLUGINS.filter((p) => !exclude.plugins?.includes(p));
  const dropped = new Set([
    ...(exclude.buttons ?? []),
    ...(exclude.plugins ?? []).flatMap((p) => PLUGIN_BUTTONS[p] ?? []),
  ]);
  // Remove the buttons, then any group left empty
  const toolbar = TOOLBAR.split("|")
    .map((group) =>
      group
        .trim()
        .split(/\s+/)
        .filter((b) => b && !dropped.has(b))
        .join(" "),
    )
    .filter(Boolean)
    .join(" | ");
  return {
    plugins,
    toolbar,
    menubar: exclude.menubar ? false : MENUBAR,
    statusbar: !exclude.statusbar,
  };
}

// The font menu: label -> CSS font-family. Picking one writes an inline
// font-family, so values are plain family names (the api's sanitizer drops
// var(), url() and the like). Web fonts must also be loaded on the site
// (next/font in apps/web's app/layout.tsx). The editor gets @font-face rules
// from the host page; apps/panel loads none of its own, so there these show
// in the system fallback unless installed locally.
type FontFamily = [
  label: string,
  stack: string,
];

// The site's own fonts (apps/web loads them with next/font)
const APP_FONTS: FontFamily[] = [
  [
    "Geist",
    "Geist, ui-sans-serif, system-ui, sans-serif",
  ],
  [
    "Geist Mono",
    "Geist Mono, ui-monospace, monospace",
  ],
];

// TinyMCE's default list (themes/silver: font_family_formats), system fonts
// that may be missing on visitors' machines
const TINYMCE_FONTS: FontFamily[] = [
  [
    "Andale Mono",
    "andale mono,monospace",
  ],
  [
    "Arial",
    "arial,helvetica,sans-serif",
  ],
  [
    "Arial Black",
    "arial black,sans-serif",
  ],
  [
    "Book Antiqua",
    "book antiqua,palatino,serif",
  ],
  [
    "Comic Sans MS",
    "comic sans ms,sans-serif",
  ],
  [
    "Courier New",
    "courier new,courier,monospace",
  ],
  [
    "Georgia",
    "georgia,palatino,serif",
  ],
  [
    "Helvetica",
    "helvetica,arial,sans-serif",
  ],
  [
    "Impact",
    "impact,sans-serif",
  ],
  [
    "Symbol",
    "symbol",
  ],
  [
    "Tahoma",
    "tahoma,arial,helvetica,sans-serif",
  ],
  [
    "Terminal",
    "terminal,monaco,monospace",
  ],
  [
    "Times New Roman",
    "times new roman,times,serif",
  ],
  [
    "Trebuchet MS",
    "trebuchet ms,geneva,sans-serif",
  ],
  [
    "Verdana",
    "verdana,geneva,sans-serif",
  ],
  [
    "Webdings",
    "webdings",
  ],
  [
    "Wingdings",
    "wingdings,zapf dingbats",
  ],
];

// Ours first; font_family_formats takes "Label=stack;Label=stack"
export const FONT_FAMILY_FORMATS = [
  ...APP_FONTS,
  ...TINYMCE_FONTS,
]
  .map(([label, stack]) => `${label}=${stack}`)
  .join(";");

// Self-hosted copy each app makes (scripts/copy-tinymce.mjs in apps/web,
// scripts/copy-assets.mjs in apps/panel); base path aware
export const tinymceBase = () => editorHost().assetUrl("plugin/tinymce");

// Content styles shared by the editor and the site (styles/content.css here,
// built into each app's public/styles/);
// content is styled under this class in both
export const contentCss = () => editorHost().assetUrl("styles/content.css");
// The site's base reset (Tailwind preflight), for the editor's iframe only
export const editorBaseCss = () =>
  editorHost().assetUrl("styles/editor-base.css");
export const CONTENT_CLASS = "app_content";
