#!/usr/bin/env node
// Builds the rich-text styles (styles/content.css, styles/editor-base.css)
// into an app's static folder, which serves them at /styles/*.css: the site
// and the editor's iframe load them by URL.
//
//   editor-css <outDir> [--watch]
//
// apps/web: `pnpm content-css` (part of dev and build); apps/panel: its
// scripts/copy-assets.mjs.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const [outArg, ...flags] = process.argv.slice(2);
if (!outArg) {
  console.error("usage: editor-css <outDir> [--watch]");
  process.exit(1);
}
const outDir = resolve(outArg);
const watch = flags.includes("--watch");

const require = createRequire(import.meta.url);
const cli = join(
  dirname(require.resolve("@tailwindcss/cli/package.json")),
  "dist",
  "index.mjs",
);
const styles = join(import.meta.dirname, "..", "styles");

const build = (name) =>
  new Promise((done, fail) => {
    const child = spawn(
      process.execPath,
      [
        cli,
        "-i",
        join(styles, name),
        "-o",
        join(outDir, name),
        watch ? "--watch" : "--minify",
      ],
      {
        stdio: "inherit",
      },
    );
    child.on("error", fail);
    child.on("exit", (code) =>
      code === 0
        ? done()
        : fail(new Error(`${name}: tailwindcss exited ${code}`)),
    );
  });

try {
  // In watch mode both run until stopped
  await Promise.all([
    build("content.css"),
    build("editor-base.css"),
  ]);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
