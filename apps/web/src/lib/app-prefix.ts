// Namespaces what the panel stores in the browser (localStorage), so it
// doesn't clash with other apps on the same host
export const APP_PREFIX = "monokit";

// localStorage keys: `monokit:panel-sidebar-width`
export const storageKey = (name: string) => `${APP_PREFIX}:${name}`;
