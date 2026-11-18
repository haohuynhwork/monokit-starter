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
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Package, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { initials } from "@/lib/initials";
import { currentUser } from "@/lib/site/shop-client";
import { isStaff, logout } from "@/lib/site/site-session";
import type { User } from "@/lib/types";

// The header's account area. Signed-out: Log in / Register links. Signed in:
// a profile menu (account, orders, sign out; staff also get the admin
// panel). The session lives in HttpOnly cookies, so it is read in the
// browser, again after every navigation (login and logout navigate).
export function HeaderUserMenu() {
  const router = useRouter();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  // undefined: not checked yet (also during SSR); null: signed out
  const [user, setUser] = useState<User | null | undefined>(undefined);

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname re-checks the session after each navigation
  useEffect(() => {
    let live = true;
    void currentUser().then((u) => {
      if (live) {
        setUser(u);
      }
    });
    return () => {
      live = false;
    };
  }, [
    pathname,
  ]);

  if (user === undefined) {
    return <div className="h-8 w-20" aria-hidden />;
  }
  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/auth/login">Log in</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/auth/register">Register</Link>
        </Button>
      </div>
    );
  }

  const name = user.shortName ?? user.displayName;
  const signOut = async () => {
    await logout();
    setUser(null);
    await router.navigate({
      to: "/auth/login",
      search: {
        redirect: undefined,
        reset: undefined,
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
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to="/account">
              <UserRound />
              My account
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/account/orders">
              <Package />
              My orders
            </Link>
          </DropdownMenuItem>
          {isStaff(user) && (
            <DropdownMenuItem asChild>
              <Link to="/admin">
                <LayoutDashboard />
                Admin panel
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={signOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
