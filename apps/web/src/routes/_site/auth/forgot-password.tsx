import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";
import { requestPasswordReset } from "@/lib/site/site-session";

export const Route = createFileRoute("/_site/auth/forgot-password")({
  head: () => ({
    meta: [
      {
        title: "Forgot password",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <AuthForm
      title="Forgot password"
      description="Enter your account's email and we'll send you a link to choose a new password."
      submitLabel="Send link"
      // The api answers the same whether or not the account exists, so the
      // notice does too
      onSubmit={async ({ email }) => {
        const trimmed = email.trim();
        if (!trimmed) {
          return {
            fieldErrors: {
              email: "Enter your email",
            },
          };
        }
        const res = await requestPasswordReset(trimmed);
        if (!res.ok) {
          return res;
        }
        return {
          notice: `If an account uses ${trimmed}, we've sent it a link. It expires in an hour; check your spam folder too.`,
        };
      }}
      fields={[
        {
          name: "email",
          label: "Email",
          type: "email",
          autoComplete: "email",
        },
      ]}
      footer={{
        text: "Remembered it?",
        to: "/auth/login",
        link: "Log in",
      }}
    />
  );
}
