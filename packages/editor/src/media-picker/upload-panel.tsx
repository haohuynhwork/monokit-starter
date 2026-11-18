"use client";

import type { Asset } from "@packages/contracts";
import { Button } from "@packages/ui/components/button";
import { cn } from "@packages/ui/lib/utils";
import {
  CheckCircle2,
  CircleAlert,
  FileText,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Same limits as the api's LIBRARY_POLICY; checked here only to say early
// what would be refused
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

type Status = "waiting" | "uploading" | "done" | "failed" | "invalid";

interface Staged {
  id: string;
  file: File;
  // Object URL for image thumbnails; revoked when dismissed or unmounted
  preview: string | null;
  status: Status;
  message?: string;
  asset?: Asset;
}

// Stage files (drop or browse), review and dismiss them, then upload one by
// one with a status each. Closes with the assets that were uploaded.
export function UploadPanel({
  folderLabel,
  accept,
  initialFiles,
  upload,
  onClose,
}: {
  // Where the files go, e.g. "This post" or a folder name
  folderLabel: string;
  accept: string[];
  // Files dropped onto the listing before the panel opened
  initialFiles: File[];
  upload: (file: File) => Promise<{
    asset?: Asset;
    message?: string;
  }>;
  onClose: (uploaded: Asset[]) => void;
}) {
  const [staged, setStaged] = useState<Staged[]>(() =>
    initialFiles.map((f) => stage(f, accept)),
  );
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // The latest list, for revoking previews on unmount
  const latest = useRef(staged);
  useEffect(() => {
    latest.current = staged;
  }, [
    staged,
  ]);
  useEffect(
    () => () => {
      for (const s of latest.current) {
        if (s.preview) {
          URL.revokeObjectURL(s.preview);
        }
      }
    },
    [],
  );

  const add = (files: File[]) =>
    setStaged((prev) => [
      ...prev,
      ...files.map((f) => stage(f, accept)),
    ]);

  const dismiss = (id: string) =>
    setStaged((prev) => {
      const gone = prev.find((s) => s.id === id);
      if (gone?.preview) {
        URL.revokeObjectURL(gone.preview);
      }
      return prev.filter((s) => s.id !== id);
    });

  const setOne = (id: string, change: Partial<Staged>) =>
    setStaged((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              ...change,
            }
          : s,
      ),
    );

  async function start() {
    setRunning(true);
    for (const item of staged.filter(
      (s) => s.status === "waiting" || s.status === "failed",
    )) {
      setOne(item.id, {
        status: "uploading",
        message: undefined,
      });
      const res = await upload(item.file);
      setOne(
        item.id,
        res.asset
          ? {
              status: "done",
              asset: res.asset,
            }
          : {
              status: "failed",
              message: res.message ?? "Upload failed",
            },
      );
    }
    setRunning(false);
  }

  const toSend = staged.filter(
    (s) => s.status === "waiting" || s.status === "failed",
  );
  const uploaded = staged.flatMap((s) =>
    s.asset
      ? [
          s.asset,
        ]
      : [],
  );
  const finished = !running && staged.length > 0 && toSend.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
      <div className="flex items-center justify-between text-sm">
        <span>
          Upload to <span className="font-medium">{folderLabel}</span>
        </span>
        <span className="text-xs text-muted-foreground">
          Public · {accept.map(shortType).join(", ")} · up to 20 MB each
        </span>
      </div>

      {/* Drop zone; also a button that opens the file dialog */}
      <button
        type="button"
        disabled={running}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add([
            ...e.dataTransfer.files,
          ]);
        }}
        className={cn(
          "flex shrink-0 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 text-sm text-muted-foreground transition-colors",
          staged.length ? "py-12" : "flex-1 py-6",
          dragging
            ? "border-primary bg-primary/5 text-foreground"
            : "hover:bg-muted/50",
        )}
      >
        <UploadCloud className="size-9" />
        <span>
          <span className="font-medium text-foreground">Drop files here</span>{" "}
          or click to browse
        </span>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        className="hidden"
        accept={accept.join(",")}
        onChange={(e) => {
          add([
            ...(e.target.files ?? []),
          ]);
          e.target.value = "";
        }}
      />

      {staged.length > 0 && (
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto rounded-lg border">
          {staged.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2 px-2 py-1.5 text-sm"
            >
              <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                {s.preview ? (
                  // biome-ignore lint/performance/noImgElement: local preview (object URL)
                  <img
                    src={s.preview}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <FileText className="size-5 text-muted-foreground" />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{s.file.name}</span>
                <span
                  className={cn(
                    "truncate text-xs",
                    s.status === "failed" || s.status === "invalid"
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {formatBytes(s.file.size)}
                  {s.message ? ` · ${s.message}` : ""}
                </span>
              </span>
              <StatusIcon status={s.status} />
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${s.file.name}`}
                disabled={s.status === "uploading" || s.status === "done"}
                onClick={() => dismiss(s.id)}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {summary(staged)}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={running}
          onClick={() => onClose(uploaded)}
        >
          {finished || uploaded.length ? "Done" : "Cancel"}
        </Button>
        {!finished && (
          <Button
            size="sm"
            disabled={running || toSend.length === 0}
            onClick={start}
          >
            {running ? (
              <>
                <Loader2 className="animate-spin" /> Uploading…
              </>
            ) : toSend.some((s) => s.status === "failed") ? (
              `Retry ${toSend.length}`
            ) : (
              `Upload ${toSend.length || ""} file${toSend.length === 1 ? "" : "s"}`
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function stage(file: File, accept: string[]): Staged {
  const problem = !accept.includes(file.type)
    ? `Not allowed (${accept.map(shortType).join(", ")})`
    : file.size > MAX_UPLOAD_BYTES
      ? "Larger than 20 MB"
      : file.size === 0
        ? "Empty file"
        : null;
  return {
    id: crypto.randomUUID(),
    file,
    preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    status: problem ? "invalid" : "waiting",
    message: problem ?? undefined,
  };
}

function StatusIcon({ status }: { status: Status }) {
  switch (status) {
    case "uploading":
      return (
        <Loader2
          aria-label="Uploading"
          className="size-4 animate-spin text-muted-foreground"
        />
      );
    case "done":
      return (
        <CheckCircle2
          aria-label="Uploaded"
          className="size-4 text-emerald-600"
        />
      );
    case "failed":
    case "invalid":
      return (
        <CircleAlert
          aria-label="Not uploaded"
          className="size-4 text-destructive"
        />
      );
    default:
      return <span className="text-xs text-muted-foreground">Waiting</span>;
  }
}

function summary(staged: Staged[]): string {
  if (staged.length === 0) {
    return "No files yet.";
  }
  const count = (status: Status) =>
    staged.filter((s) => s.status === status).length;
  return [
    `${staged.length} file${staged.length === 1 ? "" : "s"}`,
    count("done") && `${count("done")} uploaded`,
    count("failed") && `${count("failed")} failed`,
    count("invalid") && `${count("invalid")} can't be uploaded`,
  ]
    .filter(Boolean)
    .join(" · ");
}

// 'image/jpeg' -> 'JPEG'
const shortType = (mime: string) => (mime.split("/")[1] ?? mime).toUpperCase();

function formatBytes(n: number): string {
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(0)} KB`;
  }
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
