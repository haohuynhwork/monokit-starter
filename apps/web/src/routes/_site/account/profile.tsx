import { createFileRoute } from "@tanstack/react-router";
import { initials } from "@/lib/initials";
import { Heading } from "@/routes/_site/account/-lib/heading";
import { AvatarForm } from "@/routes/admin/_auth/account/-lib/avatar-form";
import { ProfileForm } from "@/routes/admin/_auth/account/-lib/profile-form";

export const Route = createFileRoute("/_site/account/profile")({
  head: () => ({
    meta: [
      {
        title: "Profile",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  // From the account layout, which loads it again after a save
  // (router.invalidate)
  const { user } = Route.useRouteContext();
  return (
    <>
      <Heading title="Profile">Your name and picture.</Heading>
      <div className="flex flex-col gap-6">
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
      </div>
    </>
  );
}
