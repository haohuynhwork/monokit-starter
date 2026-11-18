import { useEffect, useState } from "react";
import { storageKey } from "@/lib/app-prefix";

// The panel's color theme, kept per browser in localStorage. "system" follows
// the OS setting. It works through the `dark` class on <html> (globals.css),
// which the panel removes when it unmounts, so the public site stays light.
export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = storageKey("panel-theme");
const DARK_QUERY = "(prefers-color-scheme: dark)";

export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia(DARK_QUERY).matches);
  document.documentElement.classList.toggle("dark", dark);
}

// Called in admin/route.tsx before the first render, so the panel doesn't
// flash light
export const restoreTheme = () => applyTheme(readTheme());

// Leaving the panel (e.g. to the site)
export const clearTheme = () =>
  document.documentElement.classList.remove("dark");

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readTheme);

  // "system": follow the OS when it changes
  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") {
      return;
    }
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [
    theme,
  ]);

  const setTheme = (next: Theme) => {
    try {
      if (next === "system") {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {}
    setThemeState(next);
  };

  return {
    theme,
    setTheme,
  };
}
