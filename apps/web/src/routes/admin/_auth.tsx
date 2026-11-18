import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@packages/ui/components/sidebar";
import { Toaster } from "@packages/ui/components/sonner";
import { TooltipProvider } from "@packages/ui/components/tooltip";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { NotificationBell } from "@/components/notifications";
import { PanelSidebar } from "@/components/panel-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { fetchMe } from "@/lib/auth";

// Pathless layout: every route under routes/admin/_auth/ needs a session. The user
// goes into the router context, typed for child loaders and components.
export const Route = createFileRoute("/admin/_auth")({
  beforeLoad: async ({ location }) => {
    const user = await fetchMe();
    if (!user) {
      throw redirect({
        to: "/admin/login",
        search: {
          next: location.href,
        },
      });
    }
    return {
      user,
    };
  },
  component: PanelLayout,
});

// The sidebar starts open; whether it was hidden isn't restored on reload.
// Its width is (see sidebar-width.tsx, restored in admin/route.tsx).
function PanelLayout() {
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider
        // Saved width; no width animation mid-drag
        style={
          {
            "--sidebar-width": "var(--panel-sidebar-width, 16rem)",
          } as React.CSSProperties
        }
        className="[[data-sidebar-resizing]_&_*]:transition-none [[data-sidebar-resizing]_&]:cursor-col-resize [[data-sidebar-resizing]_&]:select-none"
      >
        <PanelSidebar />
        <SidebarInset className="min-w-0 bg-canvas">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3">
            {/* Shows and hides the sidebar (also Ctrl/⌘+B) */}
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell />
              <UserMenu />
            </div>
          </header>
          <main className="min-w-0 flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster position="top-right" />
    </TooltipProvider>
  );
}
