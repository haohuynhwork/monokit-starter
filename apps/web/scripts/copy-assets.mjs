// TinyMCE loads its skins, icons, plugins and themes at runtime by URL, so
// the package is served as static files from /plugin/tinymce (self-hosted,
// GPL; see licenseKey in rich-text-editor.tsx). The rich-text content styles
// are built from @packages/editor's sources (its editor-css script, as
// apps/web does), so the editor shows content like the site. Runs before dev
// and build.
import { execFileSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pub = join(import.meta.dirname, "..", "public");

const tinymce = dirname(require.resolve("tinymce/package.json"));
const to = join(pub, "plugin", "tinymce");
rmSync(to, {
  recursive: true,
  force: true,
});
cpSync(tinymce, to, {
  recursive: true,
  // Sources and docs aren't needed in the browser
  filter: (src) => !/\.(d\.ts|md)$|[/\\](composer|bower)\.json$/.test(src),
});
console.log(`Copied TinyMCE to ${to}`);

const editor = dirname(require.resolve("@packages/editor/package.json"));
execFileSync(
  process.execPath,
  [
    join(editor, "scripts", "build-css.mjs"),
    join(pub, "styles"),
  ],
  {
    stdio: "inherit",
  },
);
console.log("Built the content styles");
