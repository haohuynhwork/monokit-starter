import { type DragEvent, useRef, useState } from "react";

// Drop target for one file, e.g. an image slot: spread `props` on the
// element, style it with `over`. Only drags that carry files react, and only
// the first file that matches `accept` (MIME types) is passed on.
export function useFileDrop(
  onFile: (file: File) => void,
  accept: readonly string[],
  disabled = false,
) {
  const [over, setOver] = useState(false);
  // dragenter/leave also fire for children; count to know when it's out
  const depth = useRef(0);
  const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");
  const reset = () => {
    depth.current = 0;
    setOver(false);
  };
  return {
    over,
    props: {
      onDragEnter: (e: DragEvent) => {
        if (disabled || !hasFiles(e)) {
          return;
        }
        e.preventDefault();
        depth.current += 1;
        setOver(true);
      },
      onDragOver: (e: DragEvent) => {
        if (disabled || !hasFiles(e)) {
          return;
        }
        // Allows the drop
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      },
      onDragLeave: (e: DragEvent) => {
        if (!hasFiles(e)) {
          return;
        }
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) {
          setOver(false);
        }
      },
      onDrop: (e: DragEvent) => {
        if (disabled || !hasFiles(e)) {
          return;
        }
        e.preventDefault();
        reset();
        const file = [
          ...e.dataTransfer.files,
        ].find((f) => accept.includes(f.type));
        if (file) {
          onFile(file);
        }
      },
    },
  };
}
