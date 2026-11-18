import { Button } from "@packages/ui/components/button";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { CartLink } from "@/components/cart-link";
import { HeaderUserMenu } from "@/components/site-header-menu";
import { WishlistLink } from "@/components/wishlist-link";
import { getMenu } from "@/lib/site/public-api";
import type { MenuItem } from "@/lib/types";
import { withBase } from "@/lib/url";

// The public site's chrome: header with the pages menu, footer. A page's
// layout hides or restyles them through the data-site-* attributes
// (_site/-lib/page-frame.tsx).
export const Route = createFileRoute("/_site")({
  loader: () => getMenu(),
  head: () => ({
    links: [
      {
        rel: "stylesheet",
        href: withBase("/styles/content.css"),
      },
    ],
  }),
  component: SiteLayout,
});

function SiteLayout() {
  const menu = Route.useLoaderData();
  return (
    <div className="flex min-h-screen flex-col">
      <header
        data-site-header
        className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      >
        <nav className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <Link to="/" className="mr-2 shrink-0 font-semibold tracking-tight">
            Monokit
          </Link>
          <div
            data-site-nav
            className="flex min-w-0 flex-wrap items-center gap-1"
          >
            <Button variant="ghost" size="sm" asChild>
              <Link to="/shop/products">Products</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link
                to="/posts"
                search={{
                  q: undefined,
                  tag: undefined,
                  page: undefined,
                }}
              >
                Posts
              </Link>
            </Button>
            {menu.map((item) => (
              <MenuLink key={item.path} item={item} />
            ))}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <WishlistLink />
            <CartLink />
            <HeaderUserMenu />
          </div>
        </nav>
      </header>
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      <footer data-site-footer className="mt-16 border-t bg-muted/30">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm text-muted-foreground">
          <nav
            data-site-footer-links
            className="flex flex-wrap gap-x-4 gap-y-1"
          >
            {menu.map((item) => (
              <Link
                key={item.path}
                to="/$"
                params={{
                  _splat: item.path,
                }}
                className="hover:text-foreground"
              >
                {item.title}
              </Link>
            ))}
            <a href={withBase("/admin")} className="hover:text-foreground">
              Admin
            </a>
          </nav>
          <span className="ml-auto">© Monokit</span>
        </div>
      </footer>
    </div>
  );
}

// A top-level page; its menu children show on hover/focus
function MenuLink({ item }: { item: MenuItem }) {
  const link = (
    <Button variant="ghost" size="sm" asChild>
      <Link
        to="/$"
        params={{
          _splat: item.path,
        }}
      >
        {item.title}
      </Link>
    </Button>
  );
  if (!item.children.length) {
    return link;
  }
  return (
    <div className="group relative">
      {link}
      <ul className="invisible absolute top-full left-0 z-30 min-w-44 rounded-md border bg-popover p-1 opacity-0 shadow-md transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        {item.children.map((c) => (
          <li key={c.path}>
            <Link
              to="/$"
              params={{
                _splat: c.path,
              }}
              className="block rounded-sm px-3 py-1.5 text-sm hover:bg-muted"
            >
              {c.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
