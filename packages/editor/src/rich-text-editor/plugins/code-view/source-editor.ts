import { html } from "@codemirror/lang-html";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { basicSetup, EditorView } from "codemirror";

// The source view's code editor: CodeMirror 6 with HTML (and the CSS / JS
// inside it) highlighted. Loaded on demand by ./index.ts (the code view), so the
// editor's bundle doesn't carry it. Tokens get named classes, colored by the
// theme below with --code-* (rich-text-editor.css, light and dark).

const highlight = HighlightStyle.define([
  {
    tag: [
      t.tagName,
      t.angleBracket,
    ],
    class: "cm-tok-tag",
  },
  {
    tag: t.attributeName,
    class: "cm-tok-attr",
  },
  {
    tag: [
      t.attributeValue,
      t.string,
    ],
    class: "cm-tok-string",
  },
  {
    tag: t.comment,
    class: "cm-tok-comment",
  },
  {
    tag: [
      t.keyword,
      t.operator,
    ],
    class: "cm-tok-keyword",
  },
  {
    tag: [
      t.number,
      t.bool,
      t.null,
    ],
    class: "cm-tok-number",
  },
  {
    tag: [
      t.propertyName,
      t.definition(t.variableName),
    ],
    class: "cm-tok-attr",
  },
  {
    tag: t.processingInstruction,
    class: "cm-tok-comment",
  },
]);

const theme = EditorView.theme({
  // "&" is the theme's class on the editor, so these are two classes deep:
  // enough to beat the TinyMCE skin's reset under .tox
  // (.tox :not(svg):not(rect) { color: inherit; font-style: inherit }),
  // which a single generated class doesn't
  "& .cm-tok-tag": {
    color: "var(--code-tag)",
  },
  "& .cm-tok-attr": {
    color: "var(--code-attr)",
  },
  "& .cm-tok-string": {
    color: "var(--code-string)",
  },
  "& .cm-tok-comment": {
    color: "var(--code-comment)",
    fontStyle: "italic",
  },
  "& .cm-tok-keyword": {
    color: "var(--code-keyword)",
  },
  "& .cm-tok-number": {
    color: "var(--code-number)",
  },
  "&": {
    height: "100%",
    fontSize: "13px",
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-scroller": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    lineHeight: "1.6",
  },
  ".cm-gutters": {
    backgroundColor: "var(--muted)",
    color: "var(--muted-foreground)",
    borderRight: "1px solid var(--border)",
  },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "color-mix(in oklch, var(--muted) 60%, transparent)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection":
    {
      backgroundColor: "var(--accent)",
    },
  ".cm-cursor": {
    borderLeftColor: "var(--foreground)",
  },
  ".cm-matchingBracket": {
    backgroundColor: "color-mix(in oklch, var(--ring) 30%, transparent)",
    outline: "none",
  },
});

export interface SourceEditor {
  getValue(): string;
  focus(): void;
  destroy(): void;
}

export function createSourceEditor(
  parent: HTMLElement,
  doc: string,
): SourceEditor {
  const view = new EditorView({
    parent,
    doc,
    extensions: [
      // Line numbers, folding, bracket matching, search, undo, ...
      basicSetup,
      html(),
      syntaxHighlighting(highlight),
      EditorView.lineWrapping,
      theme,
      EditorView.contentAttributes.of({
        "aria-label": "HTML source",
        spellcheck: "false",
      }),
    ],
  });
  return {
    getValue: () => view.state.doc.toString(),
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
}
