import type { Editor } from "tinymce";
import { codeViewPlugin } from "./code-view";
import { contentFormatsPlugin } from "./content-formats";
import { customPreviewPlugin, PREVIEW_DATA_OPTION } from "./custom-preview";

// Custom plugins, each a function run from the editor's `setup`. They add
// toolbar buttons or views under their own name; list that name in the
// toolbar to show it.
export const CUSTOM_PLUGINS: ((editor: Editor) => void)[] = [
  codeViewPlugin,
  customPreviewPlugin,
  contentFormatsPlugin,
];

export { codeViewPlugin, customPreviewPlugin, PREVIEW_DATA_OPTION };
