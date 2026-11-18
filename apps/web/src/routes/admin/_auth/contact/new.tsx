import { createFileRoute, Link } from "@tanstack/react-router";
import { Empty } from "@/components/pager";
import { isStaff } from "@/lib/auth";
import { NewMessageForm } from "@/routes/admin/_auth/contact/-lib/new-message-form";

// Staff only; the api checks the role too
export const Route = createFileRoute("/admin/_auth/contact/new")({
  component: NewMessagePage,
});

function NewMessagePage() {
  const { user } = Route.useRouteContext();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          to="/admin/contact"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Messages
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New message</h1>
        <p className="text-sm text-muted-foreground">
          Record a message that came in another way, such as a phone call. It
          isn&apos;t mailed.
        </p>
      </div>
      {isStaff(user) ? (
        <NewMessageForm />
      ) : (
        <Empty>Only admins and editors can add contact messages.</Empty>
      )}
    </div>
  );
}
