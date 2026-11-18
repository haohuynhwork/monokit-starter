# @packages/editor

The media picker and the rich-text editor (TinyMCE), used by `apps/web`'s
admin panel. Source only, like `@packages/ui`: Vite bundles it.

The app-specific parts (media api calls, static file URLs, localStorage keys,
toasts) come from the host app through `configureEditor()` (`src/host.ts`).
Each app calls it in its `src/components/{media-picker,rich-text-editor}/index.ts`
and re-exports the package from there, so app code keeps importing
`@/components/media-picker` and `@/components/rich-text-editor`.

Each app still serves TinyMCE's files itself at `plugin/tinymce` (its
copy script) and the content styles at `styles/`. Their sources live here
(`styles/`); `editor-css <outDir>` (`scripts/build-css.mjs`) builds them.
