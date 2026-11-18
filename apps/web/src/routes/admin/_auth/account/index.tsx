import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import { createFileRoute } from "@tanstack/react-router";
import { initials } from "@/lib/initials";
import { AvatarForm } from "@/routes/admin/_auth/account/-lib/avatar-form";
import { ChangePasswordForm } from "@/routes/admin/_auth/account/-lib/change-password-form";
import { ProfileForm } from "@/routes/admin/_auth/account/-lib/profile-form";

// The signed-in user comes from the _auth layout, which fetches it again on
// `router.invalidate()` (after a save here)
export const Route = createFileRoute("/admin/_auth/account/")({
  component: AccountPage,
});

function AccountPage() {
  const { user } = Route.useRouteContext();
  const rows: [
    string,
    string,
  ][] = [
    [
      "Name",
      user.displayName,
    ],
    [
      "Email",
      user.email,
    ],
    [
      "Role",
      user.role,
    ],
    [
      "Status",
      user.status,
    ],
  ];
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Account</CardTitle>
          <CardDescription>Your profile on Monokit.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[6rem_1fr] gap-y-3 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <ProfileForm
        names={{
          displayName: user.displayName,
          shortName: user.shortName,
          givenName: user.givenName ?? null,
          familyName: user.familyName ?? null,
        }}
      />
      <AvatarForm
        avatarUrl={user.avatarUrl}
        initials={initials(user.displayName)}
      />
      <ChangePasswordForm />
    </div>
  );
}
