import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { fetchMe } from "@/lib/site/site-session";
import { AccountNav } from "@/routes/_site/account/-lib/account-nav";

// The customer's account: a sidebar of sections next to the page. Browser
// only (it calls the api with the visitor's cookies); signed-out visitors go
// to /login and come back.
export const Route = createFileRoute("/_site/account")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = await fetchMe();
    if (!user) {
      throw redirect({
        to: "/auth/login",
        search: {
          redirect: location.href,
        },
      });
    }
    return {
      user,
    };
  },
  component: AccountLayout,
});

function AccountLayout() {
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-12 md:grid-cols-[12rem_1fr] md:gap-10">
      <aside className="md:sticky md:top-20 md:self-start">
        <p className="mb-3 hidden px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase md:block">
          My account
        </p>
        <AccountNav />
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </main>
  );
}
