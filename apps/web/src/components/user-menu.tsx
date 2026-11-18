import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@packages/ui/components/avatar";
import { Button } from "@packages/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@packages/ui/components/dropdown-menu";
import { getRouteApi, Link, useRouter } from "@tanstack/react-router";
import { Globe, LogOut, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { initials } from "@/lib/initials";

const authRoute = getRouteApi("/admin/_auth");

// The public site, for "View site" (another origin); hidden when unset
const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "").replace(/\/+$/, "");

// The header's profile menu (apps/web's UserMenu area="panel"): avatar,
// who is signed in, links to the site and the account, log out
export function UserMenu() {
  const { user } = authRoute.useRouteContext();
  const router = useRouter();
  const name = user.shortName ?? user.displayName;
  const logout = async () => {
    // Clears the auth cookies
    await api("/auth/logout", {
      method: "POST",
      silent: true,
    });
    await router.navigate({
      to: "/admin/login",
      search: {
        next: undefined,
      },
    });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 px-1.5"
          aria-label="Open profile menu"
        >
          <Avatar className="size-6">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
            <AvatarFallback className="text-[0.65rem]">
              {initials(user.displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate sm:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate font-medium text-foreground">
            {user.displayName}
          </span>
          <span className="truncate text-xs font-normal">{user.email}</span>
          <span className="text-xs font-normal capitalize">{user.role}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {SITE_URL && (
            <DropdownMenuItem asChild>
              <a href={`${SITE_URL}/`}>
                <Globe />
                View site
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            {/* Cast until the account route is ported (see panel-sidebar) */}
            <Link to="/admin/account">
              <UserRound />
              Account
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={logout}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
