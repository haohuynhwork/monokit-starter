import { createFileRoute } from "@tanstack/react-router";
import { Heading } from "@/routes/_site/account/-lib/heading";
import { ChangePasswordForm } from "@/routes/admin/_auth/account/-lib/change-password-form";

export const Route = createFileRoute("/_site/account/security")({
  head: () => ({
    meta: [
      {
        title: "Password",
      },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <>
      <Heading title="Password" />
      <div className="max-w-md">
        <ChangePasswordForm />
      </div>
    </>
  );
}
