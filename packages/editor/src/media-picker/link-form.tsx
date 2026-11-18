"use client";

import type { Asset } from "@packages/contracts";
import { Button } from "@packages/ui/components/button";
import { FieldError } from "@packages/ui/components/field";
import { useState, useTransition } from "react";

export type LinkError = {
  message: string;
  field?: "name" | "url";
};

// Checked before saving; the api checks the same and more
function checkLink(name: string, url: string): Record<string, string> {
  const e: Record<string, string> = {};
  if (!url) {
    e.url = "Enter a URL.";
  } else if (url.length > 2048) {
    e.url = "Use at most 2048 characters.";
  } else if (!/^https?:\/\/[^\s/]+/i.test(url)) {
    e.url = "Enter a full http(s) URL.";
  }
  if (!name) {
    e.name = "Enter a name.";
  } else if (name.length > 255) {
    e.name = "Use at most 255 characters.";
  }
  return e;
}

// Add or edit a link (name and URL), over the browser. Not a Radix dialog:
// the picker sits above TinyMCE (z-1400) without a focus trap.
export function LinkForm({
  link,
  folderLabel,
  onSave,
  onCancel,
}: {
  link: Asset | null;
  folderLabel: string;
  onSave: (name: string, url: string) => Promise<LinkError | null>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(link?.name ?? "");
  const [url, setUrl] = useState(link?.url ?? "");
  // Not about one field (e.g. permissions)
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the backdrop; Escape also closes
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 p-4 backdrop-blur-[1px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <form
        noValidate
        aria-label={link ? "Edit link" : "Add link"}
        className="flex w-full max-w-md flex-col gap-4 rounded-xl border bg-popover p-5 shadow-lg"
        onSubmit={(e) => {
          e.preventDefault();
          // Not the page's form around the (portaled) picker
          e.stopPropagation();
          setError(null);
          const invalid = checkLink(name.trim(), url.trim());
          setFieldErrors(invalid);
          if (Object.keys(invalid).length > 0) {
            return;
          }
          startSaving(async () => {
            const res = await onSave(name.trim(), url.trim());
            if (res?.field) {
              setFieldErrors({
                [res.field]: res.message,
              });
            } else {
              setError(res?.message ?? null);
            }
          });
        }}
      >
        <div>
          <h3 className="font-semibold">{link ? "Edit link" : "Add link"}</h3>
          <p className="text-sm text-muted-foreground">
            {link
              ? "Content already using it keeps the old URL until edited."
              : `An image or file hosted elsewhere, added to ${folderLabel}.`}
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          URL
          <input
            type="url"
            // biome-ignore lint/a11y/noAutofocus: the form opens on purpose
            autoFocus
            placeholder="https://"
            value={url}
            aria-invalid={!!fieldErrors.url || undefined}
            onChange={(e) => {
              setUrl(e.target.value);
              // A name from the URL's last part until one is typed
              if (!link && (name === "" || name === nameFromUrl(url))) {
                setName(nameFromUrl(e.target.value));
              }
            }}
            className={INPUT_CLASS}
          />
          <FieldError>{fieldErrors.url}</FieldError>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Name
          <input
            value={name}
            aria-invalid={!!fieldErrors.name || undefined}
            onChange={(e) => setName(e.target.value)}
            className={INPUT_CLASS}
          />
          <FieldError>{fieldErrors.name}</FieldError>
        </label>
        {isImageUrl(url) && (
          <span className="flex h-32 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            <img src={url} alt="" className="max-h-full object-contain" />
          </span>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Saving…" : link ? "Save" : "Add link"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Red border once aria-invalid is set
const INPUT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 font-normal aria-invalid:border-destructive";

// "https://x.com/a/photo.jpg?w=1" -> "photo.jpg"
function nameFromUrl(url: string): string {
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).at(-1);
    return last ? decodeURIComponent(last) : "";
  } catch {
    return "";
  }
}

const isImageUrl = (url: string) =>
  /^https?:\/\/.+\.(png|jpe?g|webp|gif|svg|avif)(\?|#|$)/i.test(url);
