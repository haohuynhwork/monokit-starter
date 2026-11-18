import "glightbox/dist/css/glightbox.min.css";
import "./lightbox.css";
import { useEffect, useId } from "react";

// GLightbox for one group of links (apps/web/AGENTS.md "Lightbox"). Put the
// returned value on each image link as `data-gallery`; clicking one opens it
// full screen with the rest of the group, in their current page order.
//
// One delegated click listener reads the links at click time, so links that
// React re-creates (reorder, edits, hot reload) keep working; GLightbox's
// own selector binding only sees the links present when it starts.
// `_refresh` is kept for callers; nothing needs re-attaching now.
export function useLightbox(_refresh = ""): string {
  // Scoped to this component's own links, never a page-wide selector
  const group = `gallery-${useId().replace(/[^\w-]/g, "")}`;

  useEffect(() => {
    let open:
      | {
          destroy: () => void;
        }
      | undefined;
    const onClick = (e: MouseEvent) => {
      // Let modified clicks open the image in a new tab as usual
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const link = (e.target as Element | null)?.closest<HTMLAnchorElement>(
        `a[data-gallery="${group}"]`,
      );
      if (!link) {
        return;
      }
      e.preventDefault();
      const links = [
        ...document.querySelectorAll<HTMLAnchorElement>(
          `a[data-gallery="${group}"]`,
        ),
      ];
      void openLightbox(
        links.map((a) => ({
          href: a.href,
          title: a.dataset.title,
          description: a.dataset.description,
        })),
        links.indexOf(link),
      ).then((lightbox) => {
        open?.destroy();
        open = lightbox;
      });
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      open?.destroy();
    };
  }, [
    group,
  ]);

  return group;
}

export interface LightboxItem {
  href: string;
  title?: string;
  description?: string;
}

// Opens GLightbox on `items` at `index`; destroy the result when done.
// Loaded on first use: glightbox reads `window` as soon as it's imported.
export async function openLightbox(
  items: LightboxItem[],
  index: number,
): Promise<{
  destroy: () => void;
}> {
  const { default: GLightbox } = await import("glightbox");
  const lightbox = GLightbox({
    elements: items.map((item) => ({
      href: item.href,
      // Stored files are served without an extension ('/serve/...'),
      // which GLightbox would otherwise open as a page
      type: "image",
      title: item.title ?? "",
      description: item.description ?? "",
    })) as [],
  });
  lightbox.openAt(Math.max(0, index));
  return lightbox;
}
