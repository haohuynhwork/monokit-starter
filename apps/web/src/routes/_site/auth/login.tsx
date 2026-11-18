import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";
import {
  fetchMe,
  goTo,
  login,
  redirectHref,
  redirectParam,
} from "@/lib/site/site-session";

// Same session as the admin: the api sets its HttpOnly cookies. Rendered in
// the browser, which holds them.
export const Route = createFileRoute("/_site/auth/login")({
  ssr: false,
  // ?redirect=/cart: where to go once signed in; ?reset=1 after a reset
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    redirect?: string;
    reset?: 1;
  } => ({
    redirect: redirectParam(s.redirect),
    reset: s.reset === 1 || s.reset === "1" ? (1 as const) : undefined,
  }),
  beforeLoad: async ({ search }) => {
    if (await fetchMe()) {
      throw redirect({
        href: redirectHref(search.redirect),
      });
    }
  },
  head: () => ({
    meta: [
      {
        title: "Log in",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect: next, reset } = Route.useSearch();
  const router = useRouter();
  return (
    <AuthForm
      notice={
        reset
          ? "Your password has been changed. Sign in with the new one."
          : undefined
      }
      title="Log in"
      description="Welcome back. Sign in to your account."
      submitLabel="Log in"
      onSubmit={async ({ email, password }) => {
        const fieldErrors: Record<string, string> = {};
        if (!email.trim()) {
          fieldErrors.email = "Enter your email";
        }
        if (!password) {
          fieldErrors.password = "Enter your password";
        }
        if (Object.keys(fieldErrors).length) {
          return {
            fieldErrors,
          };
        }
        const res = await login(email.trim(), password);
        if (res.ok) {
          goTo(router, next);
        }
        return res;
      }}
      fields={[
        {
          name: "email",
          label: "Email",
          type: "email",
          autoComplete: "email",
        },
        {
          name: "password",
          label: "Password",
          type: "password",
          autoComplete: "current-password",
          link: {
            to: "/auth/forgot-password",
            label: "Forgot password?",
          },
        },
      ]}
      footer={{
        text: "No account yet?",
        to: "/auth/register",
        search: {
          redirect: next,
        },
        link: "Register",
      }}
    />
  );
}
