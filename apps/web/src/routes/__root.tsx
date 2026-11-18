import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { lazy, type ReactNode, Suspense } from "react";
import type { User } from "@/lib/types";
import { withBase } from "@/lib/url";
import styles from "../styles.css?url";

// Dev only: TanStack Devtools with the router panel; the imports are dropped
// from production builds
const Devtools = import.meta.env.DEV
  ? lazy(async () => {
      const [{ TanStackDevtools }, { TanStackRouterDevtoolsPanel }] =
        await Promise.all([
          import("@tanstack/react-devtools"),
          import("@tanstack/react-router-devtools"),
        ]);
      return {
        default: () => (
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "TanStack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        ),
      };
    })
  : () => null;

// What every route's beforeLoad / loader can read. `user` is set by
// admin/_auth.
export type RouterContext = {
  user: User | null;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Monokit",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: styles,
      },
      {
        rel: "icon",
        href: withBase("/favicon.ico"),
      },
    ],
  }),
  shellComponent: RootDocument,
  component: () => (
    <>
      <Outlet />
      <Suspense>
        <Devtools />
      </Suspense>
    </>
  ),
  notFoundComponent: () => (
    <p className="p-6 text-sm text-muted-foreground">Page not found.</p>
  ),
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-full">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
