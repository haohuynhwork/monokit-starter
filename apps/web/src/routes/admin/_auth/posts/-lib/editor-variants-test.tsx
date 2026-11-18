import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import { useState } from "react";
import {
  type EditorVariant,
  RichTextEditor,
  type RichTextEditorProps,
} from "@/components/rich-text-editor";

const VARIANTS: EditorVariant[] = [
  "standard",
  "basic",
  "minimal",
  "full",
];

// TEMPORARY: tries the public users' editor (variant="standard") next to the
// real one. Outside the post form, so nothing here is saved; remove once
// the standard editor is used for real (e.g. reviews).
export function EditorVariantsTest({
  onUploadImage,
  filePicker,
}: {
  // Where test images go (the post's folder, like the real editor's)
  onUploadImage: (file: File) => Promise<string>;
  // The media picker, as the real editor gets it
  filePicker: RichTextEditorProps["filePicker"];
}) {
  const [html, setHtml] = useState("");
  const [uploads, setUploads] = useState(false);
  const [variant, setVariant] = useState<EditorVariant>("standard");
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>Editor variants (test only)</CardTitle>
        <CardDescription>
          Try each variant (config.ts VARIANT_EXCLUDES). Not saved with the
          post; the HTML it produces shows below.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div role="group" aria-label="Variant" className="flex flex-wrap gap-1">
          {VARIANTS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={variant === v}
              onClick={() => setVariant(v)}
              className="rounded-md border px-2.5 py-1 text-sm aria-pressed:bg-muted aria-pressed:font-medium"
            >
              {v}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={uploads}
            onChange={(e) => setUploads(e.target.checked)}
          />
          Upload and browse images (into this post&apos;s folder); off: images
          by URL only
        </label>
        <RichTextEditor
          // TinyMCE reads its setup once: remount when the flag changes
          key={`${variant}-${uploads ? "uploads" : "plain"}`}
          name="editorVariantsTest"
          initialValue=""
          variant={variant}
          uploads={uploads}
          onUploadImage={onUploadImage}
          filePicker={filePicker}
          placeholder="Write a review…"
          onChange={setHtml}
        />
        <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-all">
          {html || "(empty)"}
        </pre>
      </CardContent>
    </Card>
  );
}
