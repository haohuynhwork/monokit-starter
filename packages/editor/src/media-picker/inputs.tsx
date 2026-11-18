"use client";
import { FieldError } from "@packages/ui/components/field";
import { cn } from "@packages/ui/lib/utils";
import { Folder } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LIST_SIZES, type ViewMode } from "./prefs";

// A number box that also changes with the mouse wheel while hovered (up adds
// one). Typed values apply on Enter or when leaving the box, kept in range.
export function ScrollNumberInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  // What's being typed; null shows the value itself
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  // React's wheel handler is passive and can't stop the list scrolling, so
  // listen natively
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Scrolling wins over half-typed text
      setDraft(null);
      const next = clamp(value + (e.deltaY < 0 ? 1 : -1));
      if (next !== value) {
        onChange(next);
      }
    };
    el.addEventListener("wheel", onWheel, {
      passive: false,
    });
    return () => el.removeEventListener("wheel", onWheel);
  });

  const commit = () => {
    const n = Number.parseInt(draft ?? "", 10);
    setDraft(null);
    const next = Number.isNaN(n) ? value : clamp(n);
    if (next !== value) {
      onChange(next);
    }
  };

  return (
    <input
      ref={ref}
      type="number"
      inputMode="numeric"
      aria-label={label}
      title={`${label} (${min}–${max}); scroll to change`}
      min={min}
      max={max}
      step={1}
      value={draft ?? String(value)}
      onChange={(e) => {
        setDraft(e.target.value);
        // Arrow buttons and keys give whole numbers in range: apply now
        const n = Number(e.target.value);
        if (Number.isInteger(n) && n >= min && n <= max) {
          onChange(n);
        }
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit();
        }
      }}
      className="h-8 w-14 rounded-lg border border-input bg-transparent px-1.5 text-center text-sm text-foreground tabular-nums"
    />
  );
}

// Inline name field for renaming or a new folder: Enter saves, Escape or
// leaving the field cancels
export function NameInput({
  view,
  value,
  error,
  preview,
  detail = "Folder",
  listSize = 1,
  checkboxSpace = false,
  onChange,
  onCommit,
  onCancel,
}: {
  view: ViewMode;
  value: string;
  error?: string;
  // Grid: what the tile's square shows (a folder icon by default) and the
  // line under the name, so the tile looks like the ones around it
  preview?: React.ReactNode;
  detail?: string;
  // List: the row size (index into LIST_SIZES), and whether to leave room
  // for the checkbox column (a new item has no checkbox of its own)
  listSize?: number;
  checkboxSpace?: boolean;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        // The picker is portaled, but React events bubble through portals:
        // without this, Enter also submits the page's form around it
        e.stopPropagation();
        onCommit();
      }}
      className={cn(
        "flex",
        view === "grid"
          ? "h-full flex-col gap-1.5 rounded-lg border border-primary p-2 text-sm"
          : cn(
              "min-w-0 flex-1 items-center gap-3 px-3",
              LIST_SIZES[listSize]?.row,
            ),
      )}
    >
      {view === "list" && (
        <>
          {checkboxSpace && <span className="size-4 shrink-0" />}
          <span
            className={cn(
              "flex shrink-0 items-center justify-center overflow-hidden rounded bg-muted",
              LIST_SIZES[listSize]?.thumb,
            )}
          >
            {preview ?? <Folder className="size-5 text-muted-foreground" />}
          </span>
        </>
      )}
      {view === "grid" && (
        <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-muted">
          {preview ?? <Folder className="size-1/3 text-muted-foreground" />}
        </span>
      )}
      <input
        // The user just asked to type a name
        // biome-ignore lint/a11y/noAutofocus: opened by the user's action
        autoFocus
        aria-label="Name"
        value={value}
        maxLength={255}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCancel}
        aria-invalid={!!error || undefined}
        className={cn(
          "h-6 w-full min-w-0 rounded-md border border-input bg-transparent px-1.5 text-sm aria-invalid:border-destructive",
          view === "list" && "max-w-sm",
        )}
      />
      {error ? (
        <FieldError className="text-xs">{error}</FieldError>
      ) : (
        view === "grid" && (
          <span className="truncate text-xs text-muted-foreground">
            {detail}
          </span>
        )
      )}
    </form>
  );
}
