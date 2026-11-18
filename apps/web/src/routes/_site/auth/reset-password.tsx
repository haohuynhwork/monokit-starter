import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";
import { resetPassword } from "@/lib/site/site-session";

export const Route = createFileRoute("/_site/auth/reset-password")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" && s.token ? s.token : undefined,
  }),
  // The token is in the URL: keep it out of search engines and out of the
  // Referer header sent to other sites
  head: () => ({
    meta: [
      {
        title: "Choose a new password",
      },
      {
        name: "robots",
        content: "noindex",
      },
      {
        name: "referrer",
        content: "no-referrer",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const router = useRouter();
  if (!token) {
    return (
      <div className="mx-auto w-full max-w-sm px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Link incomplete</CardTitle>
            <CardDescription>
              This reset link is missing its token.{" "}
              <Link
                to="/auth/forgot-password"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Ask for a new one
              </Link>
              .
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  return (
    <AuthForm
      title="Choose a new password"
      description="At least 8 characters. You'll sign in with it next."
      submitLabel="Change password"
      onSubmit={async ({ password, confirmPassword }) => {
        if (password !== confirmPassword) {
          return {
            fieldErrors: {
              confirmPassword: "Passwords do not match",
            },
          };
        }
        const res = await resetPassword(token, password);
        if (res.ok) {
          await router.navigate({
            to: "/auth/login",
            search: {
              reset: 1,
            },
          });
        }
        return res;
      }}
      fields={[
        {
          name: "password",
          label: "New password",
          type: "password",
          autoComplete: "new-password",
        },
        {
          name: "confirmPassword",
          label: "Repeat it",
          type: "password",
          autoComplete: "new-password",
        },
      ]}
      footer={{
        text: "Link expired?",
        to: "/auth/forgot-password",
        link: "Ask for a new one",
      }}
    />
  );
}
