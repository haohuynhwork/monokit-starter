import { cn } from "@packages/ui/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  KeyRound,
  LayoutDashboard,
  MapPin,
  Package,
  UserRound,
} from "lucide-react";

const ITEMS = [
  {
    to: "/account",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    to: "/account/orders",
    label: "Orders",
    icon: Package,
  },
  {
    to: "/account/addresses",
    label: "Addresses",
    icon: MapPin,
  },
  {
    to: "/account/profile",
    label: "Profile",
    icon: UserRound,
  },
  {
    to: "/account/security",
    label: "Password",
    icon: KeyRound,
  },
] as const;

// The account's sections: a sidebar on wide screens, a scrolling row of
// tabs on phones. An order's page keeps "Orders" active.
export function AccountNav() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname.replace(/\/+$/, ""),
  });
  const active = (to: string) =>
    to === "/account" ? pathname.endsWith(to) : pathname.includes(`${to}`);
  return (
    <nav aria-label="Account">
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="shrink-0">
            <Link
              to={to}
              aria-current={active(to) ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                active(to) && "bg-muted font-medium text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
