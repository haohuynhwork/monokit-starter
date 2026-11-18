import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@packages/ui/components/sidebar";
import {
  getRouteApi,
  Link,
  type LinkProps,
  useRouterState,
} from "@tanstack/react-router";
import {
  Activity,
  ChevronRight,
  Coins,
  FileText,
  FolderTree,
  Images,
  Inbox,
  Languages,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  Package,
  PanelsTopLeft,
  Settings,
  ShieldCheck,
  ShoppingCart,
  UserRound,
  Users,
} from "lucide-react";
import { useState } from "react";
import { isAdmin, isStaff } from "@/lib/auth";
import type { User } from "@/lib/types";
import { ResizableSidebarRail } from "./sidebar-width";

const authRoute = getRouteApi("/admin/_auth");

// Who sees an entry; the pages and the api check the role too
type Audience = "staff" | "admin";

// Typed: only routes that exist compile
type To = NonNullable<LinkProps["to"]>;

interface NavItem {
  href: To;
  // Default: everyone signed in
  audience?: Audience;
  label: string;
  icon: LucideIcon;
  // Sub-sections, toggled by the chevron; open while one of them is active.
  // The item itself links to the section's main list.
  children?: {
    href: To;
    label: string;
  }[];
}

// Add panel sections here
const GROUPS: {
  label?: string;
  // Applies to every item of the group
  audience?: Audience;
  items: NavItem[];
}[] = [
  {
    items: [
      {
        href: "/admin",
        label: "Overview",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        href: "/admin/media",
        label: "Media",
        icon: Images,
      },
      {
        href: "/admin/pages",
        label: "Pages",
        icon: PanelsTopLeft,
        children: [
          {
            href: "/admin/pages/layouts",
            label: "Layouts",
          },
        ],
      },
      {
        href: "/admin/posts",
        label: "Posts",
        icon: FileText,
        children: [
          {
            href: "/admin/posts",
            label: "All posts",
          },
          {
            href: "/admin/posts/tags",
            label: "Tags",
          },
        ],
      },
      // Contact-form messages; staff only, the pages and the api check
      {
        href: "/admin/contact",
        label: "Messages",
        icon: Inbox,
        audience: "staff",
      },
    ],
  },
  // Staff (admins, editors); the pages and the api check the role
  {
    label: "Shop",
    audience: "staff",
    items: [
      {
        href: "/admin/orders",
        label: "Orders",
        icon: ShoppingCart,
      },
      {
        href: "/admin/products",
        label: "Products",
        icon: Package,
      },
      {
        href: "/admin/categories",
        label: "Categories",
        icon: FolderTree,
      },
    ],
  },
  // Reference data (geo context), staff only; the pages and the api check
  // the role
  {
    label: "Localization",
    audience: "staff",
    items: [
      {
        href: "/admin/regions",
        label: "Regions",
        icon: MapPin,
      },
      {
        href: "/admin/locales",
        label: "Locales",
        icon: Languages,
      },
      {
        href: "/admin/currencies",
        label: "Currencies",
        icon: Coins,
      },
    ],
  },
  // Admins only; the pages and the api check too
  {
    label: "Admin",
    audience: "admin",
    items: [
      {
        href: "/admin/users",
        label: "Users",
        icon: Users,
      },
      {
        href: "/admin/permissions",
        label: "Permissions",
        icon: ShieldCheck,
      },
      {
        href: "/admin/settings",
        label: "Settings",
        icon: Settings,
      },
      {
        href: "/admin/activity",
        label: "Activity",
        icon: Activity,
      },
    ],
  },
  // The signed-in user's own; scrolls with the rest (not pinned)
  {
    label: "You",
    items: [
      {
        href: "/admin/account",
        label: "Account",
        icon: UserRound,
      },
      {
        href: "/admin/account/addresses",
        label: "Addresses",
        icon: MapPin,
      },
    ],
  },
];

// The panel's side navigation: hides completely (toggle in the panel header,
// Ctrl/⌘+B, or the edge rail) and becomes a drawer on phones
export function PanelSidebar() {
  const { user } = authRoute.useRouteContext();
  const groups = GROUPS.filter((g) => sees(user, g.audience))
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => sees(user, item.audience)),
    }))
    .filter((g) => g.items.length > 0);
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        {/* The brand goes to the host's root (outside the app's base path);
            Overview is the panel's home */}
        <a
          href="/"
          title="Home"
          className="flex h-8 items-center gap-2 px-2 font-semibold"
        >
          <PanelsTopLeft className="size-5 shrink-0 text-sidebar-foreground/70" />
          Monokit
        </a>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group, i) => (
          <SidebarGroup key={group.label ?? i}>
            {group.label && (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <Menu items={group.items} all={groups.flatMap((g) => g.items)} />
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      {/* Edge: click to collapse/expand, drag to resize, double-click to reset */}
      <ResizableSidebarRail />
    </Sidebar>
  );
}

const sees = (user: User, audience: Audience | undefined) =>
  audience === "admin"
    ? isAdmin(user)
    : audience === "staff"
      ? isStaff(user)
      : true;

// `all`: every group's items, so the most specific match is chosen across
// groups (Overview is alone in its group and would match every /admin page)
function Menu({ items, all }: { items: NavItem[]; all: NavItem[] }) {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  return <MenuItems items={items} all={all} pathname={pathname} />;
}

function MenuItems({
  items,
  all,
  pathname,
}: {
  items: NavItem[];
  all: NavItem[];
  pathname: string | null;
}) {
  // Sections stay active on their sub-pages (e.g. /posts/5); the most
  // specific match wins, so /account/addresses isn't also Account and
  // /pages/layouts/3 is Layouts, not Pages
  const active =
    pathname === null
      ? undefined
      : all
          .flatMap((item) => [
            item,
            ...(item.children ?? []),
          ])
          .filter(
            ({ href }) =>
              pathname === href ||
              (href !== "/" && pathname.startsWith(`${href}/`)),
          )
          .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <SidebarMenu>
      {items.map((item) => (
        <MenuEntry key={item.href} item={item} active={active} />
      ))}
    </SidebarMenu>
  );
}

function MenuEntry({
  item: { href, label, icon: Icon, children },
  active,
}: {
  item: NavItem;
  active: string | undefined;
}) {
  // Opens by itself only on a sub-item's page, not on the item's own list
  const inside = !!children?.some((c) => c.href === active);
  const [open, setOpen] = useState(inside);
  // Navigating into the section opens it (state adjusted while rendering)
  const [wasInside, setWasInside] = useState(inside);
  if (inside !== wasInside) {
    setWasInside(inside);
    if (inside) {
      setOpen(true);
    }
  }
  // A sub-item with the item's own href (All posts) takes the highlight
  const current = active === href && !children?.some((c) => c.href === href);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={current}>
        <Link to={href} aria-current={current ? "page" : undefined}>
          <Icon />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
      {children && (
        <>
          <SidebarMenuAction
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
            className={open ? "rotate-90" : undefined}
          >
            <ChevronRight />
          </SidebarMenuAction>
          {open && (
            <SidebarMenuSub>
              {children.map((child) => (
                <SidebarMenuSubItem key={child.href}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={active === child.href}
                  >
                    <Link
                      to={child.href}
                      aria-current={active === child.href ? "page" : undefined}
                    >
                      <span>{child.label}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          )}
        </>
      )}
    </SidebarMenuItem>
  );
}
