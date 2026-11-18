import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// The web app (TanStack Start): the public site (SSR) and the admin panel at
// /admin (client-rendered). Browsers call the api at /api on this origin and
// the dev server proxies it, so the api's HttpOnly auth cookies work without
// CORS. In production put the same /api and /socket.io (websocket) proxies
// in front (nginx, the ingress).
export default defineConfig(({ mode }) => {
  // The repo's .env (API_PORT, API_PREFIX, WEB_PORT)
  const env = loadEnv(mode, "../..", "");
  const apiOrigin = (
    env.API_URL ?? `http://localhost:${env.API_PORT ?? 3000}`
  ).replace(/\/+$/, "");
  const prefix = (env.API_PREFIX ?? "")
    .replace(/^\/*/, "/")
    .replace(/\/+$/, "");
  // The web app's base path ('/monokit'; '' at the root), from the same
  // PUBLIC_WEB_URL the api builds file URLs with
  const webBase = (env.PUBLIC_WEB_URL ?? "")
    .replace(/^https?:\/\/[^/]+/, "")
    .replace(/\/+$/, "");
  return {
    base: webBase ? `${webBase}/` : "/",
    plugins: [
      // First: tags elements with data-tsd-source for the devtools source
      // inspector (Shift+Alt+Ctrl + click); dev server only
      devtools(),
      // Before react(): routes from src/routes/ (src/routeTree.gen.ts),
      // SSR and server functions
      tanstackStart(),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: Number(env.WEB_PORT ?? 3002),
      proxy: {
        [`${webBase}/api`]: {
          target: apiOrigin,
          changeOrigin: true,
          // /monokit/api/users -> {prefix}/users; the refresh cookie's path
          // ({prefix}/auth) moves under the web base so browsers send it
          rewrite: (path: string) =>
            `${prefix}${path.slice(`${webBase}/api`.length)}`,
          cookiePathRewrite: {
            [`${prefix}/auth`]: `${webBase}/api/auth`,
          },
        },
        // File URLs from the api are relative to the web app's base path
        // ('/monokit/serve/<key>', signed '/assets/:id/content' and
        // '/storage/...' links); forwarded like the web app does
        ...Object.fromEntries(
          [
            "serve",
            "assets",
            "storage",
          ].map((route) => [
            `${webBase}/${route}/`,
            {
              target: apiOrigin,
              changeOrigin: true,
              rewrite: (path: string) =>
                `${prefix}${path.slice(webBase.length)}`,
            },
          ]),
        ),
        // The realtime socket (socket.io, unprefixed on the api)
        [`${webBase}/socket.io`]: {
          target: apiOrigin,
          changeOrigin: true,
          ws: true,
          rewrite: (path: string) => path.slice(webBase.length),
        },
      },
    },
  };
});
