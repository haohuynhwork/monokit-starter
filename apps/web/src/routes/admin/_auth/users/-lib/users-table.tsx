import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@packages/ui/components/avatar";
import { Badge } from "@packages/ui/components/badge";
import { Button } from "@packages/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@packages/ui/components/table";
import { useRouter } from "@tanstack/react-router";
import { Ban, CircleCheck, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { EmptyRow, type EmptyText } from "@/components/empty-row";
import type { User } from "@/lib/api";
import { initials } from "@/lib/initials";
import type { RoleView } from "@/lib/types";
import { deleteUser, setStatus, type UserActionState } from "./actions";
import { RoleSelect, UserActions } from "./user-controls";

type Bulk = "delete" | "disable" | "enable";

const BULK: Record<
  Bulk,
  {
    label: string;
    run: (id: string) => Promise<UserActionState>;
  }
> = {
  delete: {
    label: "Delete",
    run: deleteUser,
  },
  disable: {
    label: "Disable",
    run: (id) => setStatus(id, "disabled"),
  },
  enable: {
    label: "Enable",
    run: (id) => setStatus(id, "active"),
  },
};

// The users of one page, with checkboxes for bulk actions. Your own row
// can't be selected, so you can't lock yourself out.
export function UsersTable({
  users,
  roles,
  meId,
  empty,
}: {
  users: User[];
  roles: RoleView[];
  meId: string;
  // Shown in the table when there are no users
  empty: EmptyText;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectable = users.filter((u) => u.id !== meId);
  const allSelected =
    selectable.length > 0 && selectable.every((u) => selected.has(u.id));
  const chosen = users.filter((u) => selected.has(u.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  // One by one, so the api's rules (e.g. the last admin) refuse single
  // users while the rest still go through
  function run(kind: Bulk) {
    const what = `${BULK[kind].label.toLowerCase()} ${chosen.length} user${chosen.length > 1 ? "s" : ""}`;
    if (
      !confirm(
        kind === "delete"
          ? `Delete ${chosen.length} user${chosen.length > 1 ? "s" : ""}? They can no longer sign in and their personal data is removed. This cannot be undone.`
          : `${what.charAt(0).toUpperCase()}${what.slice(1)}?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const failed: string[] = [];
      for (const user of chosen) {
        const res = await BULK[kind].run(user.id);
        if (!res.ok) {
          failed.push(`${user.displayName}: ${res.message ?? "failed"}`);
        }
      }
      setMessage(
        failed.length
          ? `${chosen.length - failed.length} done, ${failed.length} not: ${failed.join("; ")}`
          : null,
      );
      setSelected(new Set());
      await router.invalidate();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
        <span
          className={selected.size ? "font-medium" : "text-muted-foreground"}
        >
          {selected.size ? `${selected.size} selected` : "No rows selected"}
        </span>
        <Button
          variant="outline"
          size="xs"
          className="ml-auto"
          disabled={pending || selected.size === 0}
          onClick={() => run("enable")}
        >
          <CircleCheck /> Enable
        </Button>
        <Button
          variant="outline"
          size="xs"
          disabled={pending || selected.size === 0}
          onClick={() => run("disable")}
        >
          <Ban /> Disable
        </Button>
        <Button
          variant="destructive"
          size="xs"
          disabled={pending || selected.size === 0}
          onClick={() => run("delete")}
        >
          <Trash2 /> {pending ? "Working…" : "Delete"}
        </Button>
        <Button
          variant="ghost"
          size="xs"
          disabled={pending || selected.size === 0}
          onClick={() => setSelected(new Set())}
        >
          Clear
        </Button>
      </div>
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allSelected}
                  disabled={selectable.length === 0}
                  onChange={() =>
                    setSelected(
                      allSelected
                        ? new Set()
                        : new Set(selectable.map((u) => u.id)),
                    )
                  }
                  className="size-4 accent-primary"
                />
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && <EmptyRow {...empty} colSpan={6} />}
            {users.map((user) => {
              const isSelf = user.id === meId;
              return (
                <TableRow
                  key={user.id}
                  data-state={selected.has(user.id) ? "selected" : undefined}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select ${user.displayName}`}
                      checked={selected.has(user.id)}
                      disabled={isSelf}
                      title={isSelf ? "That's you" : undefined}
                      onChange={() => toggle(user.id)}
                      className="size-4 accent-primary"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        {user.avatarUrl && (
                          <AvatarImage src={user.avatarUrl} alt="" />
                        )}
                        <AvatarFallback className="text-xs">
                          {initials(user.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">
                          {user.displayName}
                          {isSelf && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              (you)
                            </span>
                          )}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleSelect user={user} isSelf={isSelf} roles={roles} />
                  </TableCell>
                  <TableCell>
                    {user.status === "active" ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="outline">Disabled</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <UserActions user={user} isSelf={isSelf} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
