import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";
import {
  fetchMe,
  goTo,
  redirectHref,
  redirectParam,
  register,
} from "@/lib/site/site-session";

export const Route = createFileRoute("/_site/auth/register")({
  ssr: false,
  // ?redirect=/cart: where to go once signed up
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    redirect?: string;
  } => ({
    redirect: redirectParam(s.redirect),
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
        title: "Register",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { redirect: next } = Route.useSearch();
  const router = useRouter();
  return (
    <AuthForm
      title="Create an account"
      description="Sign up to order and track your purchases."
      submitLabel="Register"
      onSubmit={async ({ displayName, email, password }) => {
        const res = await register({
          displayName: displayName.trim(),
          email: email.trim(),
          password,
        });
        if (res.ok) {
          goTo(router, next);
        }
        return res;
      }}
      fields={[
        {
          name: "displayName",
          label: "Name",
          type: "text",
          autoComplete: "name",
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          autoComplete: "email",
        },
        {
          name: "password",
          label: "Password (8+ characters)",
          type: "password",
          autoComplete: "new-password",
        },
      ]}
      footer={{
        text: "Already have an account?",
        to: "/auth/login",
        search: {
          redirect: next,
        },
        link: "Log in",
      }}
    />
  );
}
