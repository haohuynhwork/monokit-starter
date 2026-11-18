"use client";

import { lazy, Suspense, useState, useSyncExternalStore } from "react";
import { editorHost } from "../host";
import {
  CONTENT_CLASS,
  contentCss,
  type EditorVariant,
  editorBaseCss,
  FONT_FAMILY_FORMATS,
  tinymceBase,
  variantConfig,
} from "./config";
import { CUSTOM_PLUGINS, PREVIEW_DATA_OPTION } from "./plugins";
import "./rich-text-editor.css";

// Its own chunk, loaded when the first editor shows. Rendered only once
// mounted, so it never loads on the server (Next.js SSR).
const Editor = lazy(() =>
  import("@tinymce/tinymce-react").then((m) => ({
    default: m.Editor,
  })),
);

export interface RichTextEditorProps {
  // The form field the HTML is submitted under
  name: string;
  initialValue: string;
  // Stores a pasted, dropped or picked image and returns its URL. Without
  // it, images can only be inserted by URL.
  onUploadImage?: (file: File) => Promise<string>;
  // Browse button in the image and link dialogs: resolves to the chosen
  // file, or null when cancelled. Without it the dialogs only take URLs.
  filePicker?: (kind: "image" | "file") => Promise<{
    // Stored in the content: 'serve/<key>' (see PickedFile)
    src: string;
    name: string;
  } | null>;
  height?: number;
  // Which features to show: "full" (default, staff), "standard" (no
  // menubar), "basic" (reviews, comments), "minimal" (a short note). Each
  // is the full editor minus VARIANT_EXCLUDES in config.ts.
  variant?: EditorVariant;
  // Variants other than "full": pasted or dropped images upload (needs
  // onUploadImage) and the Browse button opens filePicker. Without it,
  // images and files can only be inserted by URL. The full editor uses both
  // whenever they are given.
  uploads?: boolean;
  placeholder?: string;
  // Values for {{placeholders}} in the Preview (custompreview renders the
  // content as a Handlebars template), e.g. { name: "Ann" }
  previewData?: Record<string, unknown>;
  // Called with the HTML on every change (block editors keep it in state)
  onChange?: (html: string) => void;
}

// A TinyMCE field for HTML content. Shared: any form can use it; the HTML is
// submitted as a hidden input under `name`.
export function RichTextEditor({
  name,
  initialValue,
  onUploadImage,
  filePicker,
  height,
  variant = "full",
  uploads = false,
  placeholder,
  previewData,
  onChange,
}: RichTextEditorProps) {
  const features = variantConfig(variant);
  // Only the full editor uploads and browses without being asked to
  const restricted = variant !== "full";
  const canUpload = !!onUploadImage && (!restricted || uploads);
  const canPick = !!filePicker && (!restricted || uploads);
  // ?? "": a caller may pass undefined (e.g. content not loaded)
  const [value, setValue] = useState(initialValue ?? "");
  const dark = useDarkTheme();
  // TinyMCE only runs in the browser, and its options read the page's
  // computed styles (themeContentStyle): none of that exists while the
  // server renders, so the editor appears once mounted
  const mounted = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const placeholderBox = (
    <div
      aria-hidden
      className="animate-pulse rounded-lg border bg-muted/30"
      style={{
        height: height ?? 500,
      }}
    />
  );

  return (
    <>
      <input type="hidden" name={name} value={value} />
      {/* A placeholder of the same height until mounted and while
          TinyMCE's chunk loads */}
      {!mounted ? (
        placeholderBox
      ) : (
        <Suspense fallback={placeholderBox}>
          <Editor
            // Remount when the theme changes; TinyMCE can't switch skins live
            key={dark ? "dark" : "light"}
            tinymceScriptSrc={`${tinymceBase()}/tinymce.min.js`}
            // Self-hosted under the GPL (TinyMCE 7+); a commercial key goes here
            // otherwise
            licenseKey="gpl"
            value={value}
            onEditorChange={(html) => {
              setValue(html);
              onChange?.(html);
            }}
            init={{
              // Where TinyMCE loads its skins, icons, plugins and themes from
              base_url: tinymceBase(),
              // What relative URLs in the content resolve against: the site
              // itself, including its base path
              document_base_url: editorHost().absoluteUrl(""),
              suffix: ".min",
              skin: dark ? "oxide-dark" : "oxide",
              // Only ours, shared with the site. Not TinyMCE's "default" /
              // "dark" content CSS: its figure, caption, code, blockquote and
              // table rules showed in the editor but not on the site.
              content_css: [
                editorBaseCss(),
                contentCss(),
              ],
              body_class: CONTENT_CLASS,
              // The editing area takes the app's colors and font (the iframe
              // can't see our CSS variables)
              content_style: themeContentStyle(),
              height: height ?? 500,
              placeholder,
              // Read by plugins/custom-preview/
              [PREVIEW_DATA_OPTION]: previewData ?? {},
              menubar: features.menubar,
              statusbar: features.statusbar,
              promotion: false,
              branding: false,
              plugins: features.plugins,
              toolbar: features.toolbar,
              toolbar_mode: "sliding",
              block_formats1:
                "Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Heading 6=h6; Preformatted=pre",
              font_family_formats: FONT_FAMILY_FORMATS,
              font_size_formats: "8px 10px 12px 14px 18px 24px 36px",
              // A comment would be stripped by the sanitizer; an <hr> survives
              pagebreak_separator: '<hr class="page-break" />',
              // Embeds: only hosts the sanitizer keeps (YouTube, Vimeo, Maps)
              media_live_embeds: true,
              media_alt_source: false,
              media_poster: false,
              // Drafts kept in this browser, per page, in case the tab closes
              autosave_prefix: "tinymce-autosave-{path}{query}-{id}-",
              autosave_restore_when_empty: false,
              autosave_ask_before_unload: false,
              autosave_retention: "1440m",
              insertdatetime_element: true,
              quickbars_selection_toolbar:
                "bold italic | quicklink h2 h3 blockquote",
              quickbars_insert_toolbar: false,
              contextmenu: "link image table",
              // Keep URLs exactly as written: the api finds inline images by
              // their serve/<key> src
              relative_urls: false,
              remove_script_host: true,
              convert_urls: false,
              image_caption: true,
              image_advtab: false,
              // Custom plugins register their buttons and views here
              setup: (editor) => {
                for (const plugin of CUSTOM_PLUGINS) {
                  plugin(editor);
                }
              },
              ...(canPick &&
                filePicker && {
                  file_picker_types: "image file",
                  file_picker_callback: (callback, _value, meta) => {
                    const kind = meta.filetype === "image" ? "image" : "file";
                    void filePicker(kind).then((file) => {
                      if (file) {
                        // Alt text for images, link text for files
                        callback(
                          file.src,
                          kind === "image"
                            ? {
                                alt: file.name,
                              }
                            : {
                                text: file.name,
                              },
                        );
                      }
                    });
                  },
                }),
              ...(canUpload &&
                onUploadImage && {
                  automatic_uploads: true,
                  paste_data_images: true,
                  images_file_types: "png,jpg,jpeg,webp,gif",
                  images_upload_handler: (blobInfo) =>
                    onUploadImage(
                      new File(
                        [
                          blobInfo.blob(),
                        ],
                        blobInfo.filename(),
                        {
                          type: blobInfo.blob().type,
                        },
                      ),
                    ),
                }),
              // Enter adds a line break (<br>), Shift+Enter starts a new
              // paragraph (like oc-shield)
              // newline_behavior: "linebreak",
              link_default_target: "_blank",
              link_assume_external_targets: "https",
              // The editor keeps every tag and attribute (source view, pastes,
              // embeds), like oc-shield. What gets stored is decided by the
              // api's sanitizer (common/infrastructure/sanitize-html.sanitizer.ts),
              // so anything it drops disappears after saving.
              valid_elements: "*[*]",
              extended_valid_elements: "*[*]",
              valid_children: "+body[style],+div[style]",
              verify_html: false,
            }}
          />
        </Suspense>
      )}
    </>
  );
}

// The app's theme (the `dark` class on <html>, as packages/ui styles it),
// kept in sync; false on the server
function useDarkTheme(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: [
          "class",
        ],
      });
      return () => observer.disconnect();
    },
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
}

// The page's @font-face rules (next/font adds them to its own stylesheet),
// with their url()s made absolute: they're relative to that stylesheet
// ("../media/x.woff2"), and in the iframe's <style> would resolve against
// the iframe's base URL instead. Stylesheets from another origin can't be
// read and are skipped.
function fontFaces(): string[] {
  const collect = (rules: CSSRuleList, base: string): string[] =>
    [
      ...rules,
    ].flatMap((rule) =>
      rule instanceof CSSFontFaceRule
        ? [
            rule.cssText.replace(
              /url\((["']?)([^"')]+)\1\)/g,
              (_, quote: string, url: string) =>
                `url(${quote}${new URL(url, base).href}${quote})`,
            ),
          ]
        : // Inside @media, @supports, @layer
          "cssRules" in rule
          ? collect((rule as CSSGroupingRule).cssRules, base)
          : [],
    );
  return [
    ...document.styleSheets,
  ].flatMap((sheet) => {
    try {
      return collect(sheet.cssRules, sheet.href ?? document.baseURI);
    } catch {
      return [];
    }
  });
}

const noSubscribe = () => () => {};

// The editing area in the app's colors, from the tokens themeContentStyle()
// passes in. Here, not in rich-text-editor.css: that styles this page, and
// the content is in an iframe it doesn't reach.
const EDITING_AREA_CSS = /*css*/ `
  /* html too: the body is only the content column (content.css) */
  html,
  body {
    background: var(--background);
    color: var(--foreground);
  }

  a {
    color: var(--primary);
  }

  /* The app's scrollbar (globals.css), which doesn't reach into iframes */
  * {
    scrollbar-width: thin;
    scrollbar-color: color-mix(in oklab, var(--muted-foreground) 40%, transparent)
      transparent;
  }

  /* Accent is near white in this theme; the ring color reads as a highlight
     in light and dark */
  ::selection {
    background: color-mix(in oklab, var(--ring) 45%, transparent);
  }

  /* Selected objects (accordion, image, table, embed, rule) and table cells:
     oxide's light blue (#b4d7ff) in our ring color. Same selectors as oxide's
     content.css, which this comes after. */
  .mce-content-body audio[data-mce-selected],
  .mce-content-body details[data-mce-selected],
  .mce-content-body embed[data-mce-selected],
  .mce-content-body img[data-mce-selected],
  .mce-content-body object[data-mce-selected],
  .mce-content-body table[data-mce-selected],
  .mce-content-body video[data-mce-selected],
  .mce-content-body hr[data-mce-selected],
  .mce-content-body [contentEditable="false"][data-mce-selected],
  .mce-content-body [contentEditable="false"] [contentEditable="true"]:focus,
  .mce-content-body [contentEditable="false"] [contentEditable="true"]:hover,
  .mce-content-body .mce-edit-focus {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
    border-radius: 4px;
  }

  .mce-content-body [data-mce-selected="inline-boundary"] {
    background-color: var(--accent);
  }

  .mce-content-body td[data-mce-selected]::after,
  .mce-content-body th[data-mce-selected]::after {
    background-color: color-mix(in oklch, var(--ring) 25%, transparent);
    border-color: color-mix(in oklch, var(--ring) 40%, transparent);
    mix-blend-mode: normal;
  }

  .ephox-snooker-resizer-bar {
    background-color: var(--ring);
  }
`;

// Resolved token values for the content iframe
function themeContentStyle(): string {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  // Empty would hide content.css's fallback
  const mono = token("--font-mono");
  // The theme tokens content.css (prose colors) and EDITING_AREA_CSS read,
  // which the iframe can't inherit from this page
  const tokens = [
    "--background",
    "--foreground",
    "--muted",
    "--muted-foreground",
    "--border",
    "--primary",
    "--ring",
    "--accent",
  ]
    .map((name) => `${name}: ${token(name)};`)
    .join(" ");
  return [
    // The page's fonts (its @font-face rules, same files), so
    // the families named below load in the iframe too
    ...fontFaces(),
    `:root {
      /* Dark scrollbars and form controls in dark mode (globals.css .dark) */
      color-scheme: ${css.colorScheme || "normal"};
      ${tokens}
      --font-sans: ${getComputedStyle(document.body).fontFamily};
      ${mono ? `--font-mono: ${mono};` : ""}
    }`,
    EDITING_AREA_CSS,
  ].join("\n");
}
