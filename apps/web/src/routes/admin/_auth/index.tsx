import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/_auth/")({
  component: Overview,
});

function Overview() {
  const { user } = Route.useRouteContext();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {user.shortName ?? user.displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {user.email} ({user.role})
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Posts</CardTitle>
            <CardDescription>Coming soon.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Media</CardTitle>
            <CardDescription>Coming soon.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
