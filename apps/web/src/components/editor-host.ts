import { configureEditor } from "@packages/editor/host";
import { notify } from "@/components/toast";
import { storageKey } from "@/lib/app-prefix";
import { absoluteUrl, assetUrl } from "@/lib/url";
import * as media from "./media-picker/actions";
import { previewContent } from "./rich-text-editor/actions";

// What @packages/editor needs from the panel; imported by the editors'
// index.ts, so it runs before any of them renders
configureEditor({
  media,
  previewContent,
  assetUrl,
  absoluteUrl,
  storageKey,
  notify,
});
