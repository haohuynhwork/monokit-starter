import { useEffect } from "react";
import { assetUrl } from "@/lib/url";

// The tab shows the unread count: "(3) Title", a red dot with the number on
// the favicon, and the app icon badge when installed (Badging API). While the
// tab is in the background, `alert` (the newest notification) flashes in the
// title until the user comes back.
export function useTabBadge(
  unread: number,
  alert: string | null,
  clearAlert: () => void,
) {
  // Title prefix. The title can change on navigation, so the
  // prefix is put back whenever the <title> changes.
  useEffect(() => {
    const apply = () => {
      const base = stripCount(document.title);
      const next = unread > 0 ? `(${count(unread)}) ${base}` : base;
      if (document.title !== next) {
        document.title = next;
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => {
      observer.disconnect();
      document.title = stripCount(document.title);
    };
  }, [
    unread,
  ]);

  // Favicon badge: every icon <link> shows the badged image (browsers pick
  // among them by size, so one added beside an .ico can be ignored), and
  // gets its own href back at zero. With no icon link, one is added.
  useEffect(() => {
    if (unread === 0) {
      return;
    }
    let restore: (() => void) | null = null;
    let cancelled = false;
    void badgedIcon(count(unread)).then((href) => {
      if (cancelled || !href) {
        return;
      }
      const links = [
        ...document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'),
      ];
      if (links.length === 0) {
        const link = document.createElement("link");
        link.rel = "icon";
        link.href = href;
        document.head.append(link);
        restore = () => link.remove();
        return;
      }
      const saved = links.map((link) => ({
        link,
        href: link.getAttribute("href"),
        type: link.getAttribute("type"),
      }));
      for (const link of links) {
        link.href = href;
        link.type = "image/svg+xml";
      }
      restore = () => {
        for (const { link, href, type } of saved) {
          setOrRemove(link, "href", href);
          setOrRemove(link, "type", type);
        }
      };
    });
    return () => {
      cancelled = true;
      restore?.();
    };
  }, [
    unread,
  ]);

  // Installed app (PWA) icon badge, where supported
  useEffect(() => {
    if ("setAppBadge" in navigator) {
      void (
        unread > 0 ? navigator.setAppBadge(unread) : navigator.clearAppBadge()
      ).catch(() => undefined);
    }
  }, [
    unread,
  ]);

  // Flash the newest one in the title while away; stop on return
  useEffect(() => {
    if (!alert) {
      return;
    }
    let showAlert = true;
    let saved = document.title;
    const flash = () => {
      if (showAlert) {
        saved = document.title;
        document.title = alert;
      } else {
        document.title = saved;
      }
      showAlert = !showAlert;
    };
    flash();
    const timer = setInterval(flash, 1500);
    const back = () => {
      if (!document.hidden) {
        clearAlert();
      }
    };
    document.addEventListener("visibilitychange", back);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", back);
      if (!showAlert) {
        document.title = saved;
      }
    };
  }, [
    alert,
    clearAlert,
  ]);
}

function setOrRemove(el: Element, name: string, value: string | null) {
  if (value === null) {
    el.removeAttribute(name);
  } else {
    el.setAttribute(name, value);
  }
}

const count = (n: number) => (n > 99 ? "99+" : String(n));

const stripCount = (title: string) => title.replace(/^\(\d+\+?\) /, "");

// The favicon with a red count in its corner, as an SVG data URL. Vector, so
// the browser renders the digits sharp at the tab's own pixel size.
async function badgedIcon(label: string): Promise<string | null> {
  const icon = await iconDataUrl();
  const height = 20;
  // 14px digits (bold, about 0.6em wide); "99+" draws its "+" smaller and
  // raised, like a superscript, so three characters fit the 32-unit icon
  const digits = label.replace("+", "");
  const plus = label.endsWith("+");
  const width = Math.max(
    height,
    Math.round(digits.length * 8.4 + (plus ? 5 : 0) + 6),
  );
  const x = 32 - width;
  const text = plus
    ? `${digits}<tspan font-size="9" dy="-3.5">+</tspan>`
    : digits;
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">',
    icon ? `<image href="${icon}" width="32" height="32"/>` : "",
    `<rect x="${x}" width="${width}" height="${height}" rx="${height / 2}" fill="#e41e3f"/>`,
    `<text x="${x + width / 2}" y="${height / 2}" dy="0.36em" text-anchor="middle" font-family="system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="14" font-weight="700" fill="#fff">${text}</text>`,
    "</svg>",
  ].join("");
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// The site's favicon as a data URL (an SVG data URL can't load other
// files); fetched once. From an .ico, only the image the tab's pixel size
// needs, so it's drawn 1:1 instead of scaled down from a bigger one.
let iconPromise: Promise<string | null> | null = null;
function iconDataUrl(): Promise<string | null> {
  iconPromise ??= fetch(assetUrl("favicon.ico"))
    .then((res) => (res.ok ? res.arrayBuffer() : null))
    .then((buf) => {
      if (!buf) {
        return null;
      }
      const ico = icoFrame(
        new Uint8Array(buf),
        16 * Math.ceil(devicePixelRatio),
      );
      return ico
        ? `data:image/x-icon;base64,${toBase64(ico)}`
        : `data:image/x-icon;base64,${toBase64(new Uint8Array(buf))}`;
    })
    .catch(() => null);
  return iconPromise;
}

// A one-image .ico holding the image closest to `px` (the smallest at least
// that size, else the largest); null when `bytes` isn't an .ico
function icoFrame(bytes: Uint8Array, px: number): Uint8Array | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    bytes.length < 6 ||
    view.getUint16(0, true) !== 0 ||
    view.getUint16(2, true) !== 1
  ) {
    return null;
  }
  const frames = Array.from(
    {
      length: view.getUint16(4, true),
    },
    (_, i) => {
      const at = 6 + i * 16;
      return {
        at,
        width: bytes[at] || 256,
        size: view.getUint32(at + 8, true),
        offset: view.getUint32(at + 12, true),
      };
    },
  ).sort((a, b) => a.width - b.width);
  const frame = frames.find((f) => f.width >= px) ?? frames.at(-1);
  if (!frame || frame.offset + frame.size > bytes.length) {
    return null;
  }
  // Header (one image) + its directory entry pointing just after it + data
  const out = new Uint8Array(22 + frame.size);
  out.set(bytes.subarray(0, 4));
  out[4] = 1;
  out.set(bytes.subarray(frame.at, frame.at + 12), 6);
  new DataView(out.buffer).setUint32(18, 22, true);
  out.set(bytes.subarray(frame.offset, frame.offset + frame.size), 22);
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) {
    text += String.fromCharCode(byte);
  }
  return btoa(text);
}
