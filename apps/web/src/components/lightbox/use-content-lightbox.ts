import { type RefObject, useEffect } from "react";
import { openLightbox } from "./use-lightbox";

// Images narrower than this (icons, emoji, badges) don't open
const MIN_WIDTH = 200;

// GLightbox for the images in rendered content (a post's rich text and its
// cover): clicking one opens it full screen with the others under `ref`, in
// page order; pass what changes the content as `refresh`. The stored HTML
// stays as is. Left out: images inside a link
// (the author's link wins), with the `no-lightbox` class, or small ones.
export function useContentLightbox(
  ref: RefObject<HTMLElement | null>,
  refresh: unknown,
): void {
  useEffect(() => {
    const root = ref.current;
    if (!root) {
      return;
    }
    const zoomable = (img: HTMLImageElement) =>
      !img.closest("a") &&
      !img.classList.contains("no-lightbox") &&
      img.naturalWidth >= MIN_WIDTH;
    // The zoom cursor once an image has loaded and qualifies
    const mark = (img: HTMLImageElement) => {
      img.classList.toggle("cursor-zoom-in", zoomable(img));
    };
    const images = [
      ...root.querySelectorAll("img"),
    ];
    for (const img of images) {
      if (img.complete) {
        mark(img);
      } else {
        img.addEventListener("load", () => mark(img), {
          once: true,
        });
      }
    }

    let open:
      | {
          destroy: () => void;
        }
      | undefined;
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const img = e.target;
      if (!(img instanceof HTMLImageElement) || !zoomable(img)) {
        return;
      }
      const group = [
        ...root.querySelectorAll("img"),
      ].filter(zoomable);
      void openLightbox(
        group.map((i) => ({
          href: i.currentSrc || i.src,
          title:
            i.closest("figure")?.querySelector("figcaption")?.textContent ||
            i.alt ||
            undefined,
        })),
        group.indexOf(img),
      ).then((lightbox) => {
        open?.destroy();
        open = lightbox;
      });
    };
    root.addEventListener("click", onClick);
    return () => {
      root.removeEventListener("click", onClick);
      open?.destroy();
    };
  }, [
    ref,
    refresh,
  ]);
}
