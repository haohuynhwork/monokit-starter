import Handlebars from "handlebars";
import type { Editor } from "tinymce";
import { editorHost } from "../../../host";
import { fitPane } from "../code-view";

// Ported from oc-shield's app/(csr)/csr/components/plugin-custom.js
// ("custompreview"): TinyMCE's preview, but shown as a full-size view inside
// the editor (like the source view) instead of a dialog, with the content
// cleaned by the api's sanitizer first (what saving would store, so tags it
// drops don't show here either), then rendered as a Handlebars template, so
// placeholders like {{name}} or
// {{get_asset "serve/<key>"}} show filled in. Values come from the
// `preview_data` editor option (the RichTextEditor `previewData` prop).
// Opened from the "custompreview" toolbar button or the View menu.
//
// Left out from the original: its "Save code" button (the view has nothing
// to save) and the demo data ({ name: "Nils" }, get_asset to google.com).
const NAME = "custompreview";
const VIEW = "custompreview-view";

// What Handlebars fills placeholders from; {} leaves them empty
export const PREVIEW_DATA_OPTION = "preview_data";

export function customPreviewPlugin(editor: Editor): void {
  editor.options.register(PREVIEW_DATA_OPTION, {
    processor: "object",
    default: {},
  });

  const toggle = () => editor.execCommand("ToggleView", false, VIEW);

  editor.ui.registry.addView(VIEW, {
    buttons: [
      {
        type: "button",
        text: "Close preview",
        buttonType: "primary",
        onAction: toggle,
      },
    ],
    onShow: (api) => {
      // A sandboxed frame without scripts: the content can't run code
      // against the panel, whatever the editor lets through
      const frame = document.createElement("iframe");
      frame.title = "Preview";
      frame.setAttribute("sandbox", "allow-same-origin allow-popups");
      fitPane(api.getContainer());
      Object.assign(frame.style, {
        position: "absolute",
        inset: "8px",
        width: "calc(100% - 16px)",
        height: "calc(100% - 16px)",
        // Framed like the source view (code-view/)
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        boxSizing: "border-box",
        // The theme's, set inside by content_style
        background: "transparent",
      });
      frame.srcdoc = previewHtml(editor, "<p>Loading preview…</p>");
      api.getContainer().replaceChildren(frame);
      void editorHost()
        .previewContent(editor.getContent())
        .then(({ html, message }) => {
          // Closed (or reopened) meanwhile
          if (!frame.isConnected) {
            return;
          }
          frame.srcdoc = previewHtml(
            editor,
            html === undefined
              ? errorHtml(message ?? "Could not load the preview.")
              : render(editor, html),
          );
        });
      api
        .getContainer()
        .parentElement?.querySelector<HTMLButtonElement>(
          ".tox-view__header button",
        )
        ?.focus();
    },
    onHide: (api) => {
      api.getContainer().replaceChildren();
    },
  });

  editor.addCommand(NAME, toggle);
  editor.ui.registry.addButton(NAME, {
    icon: "preview",
    tooltip: "Preview",
    onAction: toggle,
    context: "any",
  });
  editor.ui.registry.addMenuItem(NAME, {
    icon: "preview",
    text: "Preview",
    onAction: toggle,
    context: "any",
  });
}

const encode = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] ?? c,
  );

const errorHtml = (message: string) =>
  `<p style="color:#b91c1c">${encode(message)}</p>`;

// A whole page like the editing area: the same content CSS, content style,
// body class and direction, around the given body
function previewHtml(editor: Editor, body: string): string {
  const head = [
    // Links open in a new tab instead of replacing the preview
    `<base href="${encode(editor.documentBaseURI.getURI())}" target="_blank">`,
    // Our content CSS only: the skin's (editing aids) isn't on the site
    ...editor.contentCSS
      .filter((url) => !url.includes("/skins/ui/"))
      .map(
        (url) =>
          `<link rel="stylesheet" href="${encode(editor.documentBaseURI.toAbsolute(url))}">`,
      ),
  ];
  const contentStyle = editor.options.get("content_style");
  if (typeof contentStyle === "string" && contentStyle) {
    head.push(`<style>${contentStyle}</style>`);
  }
  const bodyClass = editor.options.get("body_class");
  const dir = editor.getBody().dir;
  return `<!DOCTYPE html><html><head>${head.join("")}</head><body class="mce-content-body ${encode(
    typeof bodyClass === "string" ? bodyClass : "",
  )}"${dir ? ` dir="${encode(dir)}"` : ""}>${body}</body></html>`;
}

// The content with its placeholders filled in; as written when it isn't a
// valid template (e.g. a stray "{{"), so the preview still opens
function render(editor: Editor, content: string): string {
  try {
    const data = {
      // {{get_asset "/serve/<key>"}} or {{get_asset "serve/<key>"}}: the
      // asset's URL on this site (plugin-custom.js had a demo version)
      get_asset: (key: unknown) =>
        typeof key === "string" ? editorHost().assetUrl(key) : "",
      ...(editor.options.get(PREVIEW_DATA_OPTION) ?? {}),
    };
    return Handlebars.compile(content)(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `${errorHtml(`Template error: ${message}`)}${content}`;
  }
}
