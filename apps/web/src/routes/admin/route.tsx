import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { restoreSidebarWidth } from "@/components/sidebar-width";
import { clearTheme, restoreTheme } from "@/lib/admin/theme";
import { setOnSignedOut } from "@/lib/api";

// The admin panel. Rendered in the browser only: it calls the api with the
// visitor's HttpOnly cookies and keeps UI state in localStorage.
export const Route = createFileRoute("/admin")({
  ssr: false,
  // The saved sidebar width and theme, before the first paint
  beforeLoad: () => {
    restoreSidebarWidth();
    restoreTheme();
  },
  head: () => ({
    meta: [
      {
        title: "Admin · Monokit",
      },
    ],
  }),
  component: AdminRoot,
});

function AdminRoot() {
  const router = useRouter();
  useEffect(() => {
    setOnSignedOut(() => {
      router.navigate({
        to: "/admin/login",
        search: {
          next: router.state.location.href,
        },
      });
    });
  }, [
    router,
  ]);
  // The theme is the panel's only; the site stays light
  useEffect(() => clearTheme, []);
  return <Outlet />;
}
