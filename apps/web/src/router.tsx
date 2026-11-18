import { createRouter } from "@tanstack/react-router";
import { withBase } from "./lib/url";
import { routeTree } from "./routeTree.gen";

// Start calls this once per request on the server and once in the browser
export function getRouter() {
  return createRouter({
    routeTree,
    basepath: withBase("") || "/",
    // Hover/focus on a link loads the next page's data
    defaultPreload: "intent",
    scrollRestoration: true,
    context: {
      user: null,
    },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
