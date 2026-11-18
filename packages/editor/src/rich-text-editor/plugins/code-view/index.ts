import type { Editor } from "tinymce";
import type { SourceEditor } from "./source-editor";

// Ported from oc-shield's "myplugin": a full-size HTML source view (instead
// of the small `code` dialog), opened from the "codeview" toolbar button,
// with syntax highlighting (CodeMirror, ./source-editor.ts). Save writes the
// edited HTML back; Cancel leaves the content as it was.
const VIEW = "codeview";

export function codeViewPlugin(editor: Editor): void {
  let source: SourceEditor | null = null;
  // Bumped on every show/hide, so a slow load can't mount into a closed view
  let shown = 0;
  const toggle = () => editor.execCommand("ToggleView", false, VIEW);

  editor.ui.registry.addButton(VIEW, {
    icon: "sourcecode",
    tooltip: "Source code",
    onAction: toggle,
  });

  editor.ui.registry.addView(VIEW, {
    onShow: (api) => {
      const container = api.getContainer();
      const showing = ++shown;
      fitPane(container);
      // Pinned to the pane's edges, so CodeMirror gets a fixed height and
      // scrolls inside it
      const host = document.createElement("div");
      Object.assign(host.style, {
        position: "absolute",
        inset: "8px",
        overflow: "hidden",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
      });
      host.textContent = "Loading…";
      container.replaceChildren(host);
      const html = editor.getContent();
      // CodeMirror is only fetched the first time the view opens
      void import("./source-editor").then(({ createSourceEditor }) => {
        if (showing !== shown) {
          return;
        }
        host.textContent = "";
        source = createSourceEditor(host, html);
        source.focus();
      });
    },
    onHide: (api) => {
      shown++;
      source?.destroy();
      source = null;
      api.getContainer().replaceChildren();
    },
    buttons: [
      {
        type: "button",
        text: "Cancel",
        buttonType: "secondary",
        onAction: toggle,
      },
      {
        type: "button",
        text: "Save",
        buttonType: "primary",
        onAction: () => {
          if (source) {
            editor.setContent(source.getValue());
            // Lets onEditorChange (and undo) see the edit
            editor.undoManager.add();
            editor.dispatch("change");
          }
          toggle();
        },
      },
    ],
  });
}

// TinyMCE's view pane is height: 100% under the view's header, so it
// overflows the view (which clips it) instead of filling what's left
export function fitPane(pane: HTMLElement): void {
  Object.assign(pane.style, {
    flex: "1 1 auto",
    height: "auto",
    minHeight: "0",
  });
}
