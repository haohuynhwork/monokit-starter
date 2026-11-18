import { SidebarRail, useSidebar } from "@packages/ui/components/sidebar";
import { useRef } from "react";
import { storageKey } from "@/lib/app-prefix";

// The panel sidebar's width, dragged on its edge rail and kept per browser in
// localStorage. It lives in the --panel-sidebar-width variable on <html>,
// which SidebarProvider reads through --sidebar-width.
const STORAGE_KEY = storageKey("panel-sidebar-width");
const VAR = "--panel-sidebar-width";
const MIN = 192;
const MAX = 384;
// Movement (px) below which a press on the rail is a click (toggle)
const DRAG_THRESHOLD = 3;

const clamp = (px: number) => Math.min(MAX, Math.max(MIN, Math.round(px)));

// Called in admin/route.tsx before the first render, so the saved width shows
// without a jump
export function restoreSidebarWidth() {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      applyWidth(clamp(saved));
    }
  } catch {}
}

function applyWidth(px: number) {
  document.documentElement.style.setProperty(VAR, `${px}px`);
}

// The edge rail: click toggles the sidebar, drag resizes it
export function ResizableSidebarRail() {
  const { state, toggleSidebar } = useSidebar();
  const dragged = useRef(false);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    dragged.current = false;
    if (state !== "expanded" || e.button !== 0) {
      return;
    }
    const startX = e.clientX;
    const root = document.documentElement;
    let width = 0;

    const onMove = (ev: PointerEvent) => {
      if (!dragged.current) {
        if (Math.abs(ev.clientX - startX) < DRAG_THRESHOLD) {
          return;
        }
        dragged.current = true;
        root.dataset.sidebarResizing = "";
      }
      width = clamp(ev.clientX);
      applyWidth(width);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      delete root.dataset.sidebarResizing;
      if (width) {
        try {
          localStorage.setItem(STORAGE_KEY, String(width));
        } catch {}
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <SidebarRail
      onPointerDown={onPointerDown}
      onClick={() => {
        if (!dragged.current) {
          toggleSidebar();
        }
      }}
      onDoubleClick={() => {
        applyWidth(256);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
      }}
    />
  );
}
