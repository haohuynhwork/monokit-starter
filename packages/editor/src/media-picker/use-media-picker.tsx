"use client";

import { useCallback, useRef, useState } from "react";
import {
  MediaPicker,
  type PickedFile,
  type PickerScope,
  type PickKind,
} from "./media-picker";

// Opens the media picker and resolves with the chosen file (null when
// cancelled), as a promise TinyMCE's file_picker_callback can wait on.
// `resolveScope` limits it to one record's folder, e.g. a post's or a
// product's; it runs on first open and a success is reused. On failure the
// picker shows the error rather than the whole library, and retries on the
// next open.
//
//   const picker = useMediaPicker({ resolveScope: () => ensureProductFolder(id) });
//   <RichTextEditor filePicker={picker.open} ... />
//   {picker.element}
//
// `openMany` picks several at once (e.g. gallery images) and resolves with
// them in the order they were clicked, or [] when cancelled.
export function useMediaPicker(options?: {
  resolveScope?: () => Promise<
    | PickerScope
    | {
        error: string;
      }
  >;
}) {
  const [kind, setKind] = useState<PickKind | null>(null);
  const [multiple, setMultiple] = useState(false);
  const [scope, setScope] = useState<PickerScope | undefined>();
  const [scopeError, setScopeError] = useState<string | undefined>();
  const resolver = useRef<((files: PickedFile[] | null) => void) | null>(null);
  const scopeLoaded = useRef(false);
  const resolveScope = options?.resolveScope;

  const close = useCallback((files: PickedFile[] | null) => {
    resolver.current?.(files);
    resolver.current = null;
    setKind(null);
  }, []);

  const show = useCallback(
    async (next: PickKind, many: boolean): Promise<PickedFile[] | null> => {
      resolver.current?.(null);
      if (resolveScope && !scopeLoaded.current) {
        const result = await resolveScope().catch(() => ({
          error: "Could not open this item's files.",
        }));
        if ("error" in result) {
          setScopeError(result.error);
        } else {
          setScope(result);
          setScopeError(undefined);
          scopeLoaded.current = true;
        }
      }
      setMultiple(many);
      setKind(next);
      return new Promise<PickedFile[] | null>((resolve) => {
        resolver.current = resolve;
      });
    },
    [
      resolveScope,
    ],
  );

  const open = useCallback(
    async (next: PickKind) => (await show(next, false))?.[0] ?? null,
    [
      show,
    ],
  );
  const openMany = useCallback(
    async (next: PickKind) => (await show(next, true)) ?? [],
    [
      show,
    ],
  );

  const element = kind && (
    <MediaPicker
      kind={kind}
      scope={scope}
      scopeError={scopeError}
      onPick={(file) =>
        close([
          file,
        ])
      }
      onPickMany={multiple ? (files) => close(files) : undefined}
      onClose={() => close(null)}
    />
  );
  return {
    open,
    openMany,
    element,
  };
}
