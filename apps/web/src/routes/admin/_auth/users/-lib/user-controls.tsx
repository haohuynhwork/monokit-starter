import { Alert, AlertDescription } from "@packages/ui/components/alert";
import { Button } from "@packages/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@packages/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@packages/ui/components/dropdown-menu";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@packages/ui/components/field";
import { Input } from "@packages/ui/components/input";
import { useRouter } from "@tanstack/react-router";
import { Ban, CircleCheck, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";
import type { User } from "@/lib/api";
import type { RoleView } from "@/lib/types";
import {
  changeRole,
  deleteUser,
  renameUser,
  setStatus,
  type UserActionState,
} from "./actions";

// Inline role select for one row; errors (e.g. last admin) show under it
export function RoleSelect({
  user,
  isSelf,
  roles,
}: {
  user: User;
  isSelf: boolean;
  roles: RoleView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label={`Role of ${user.displayName}`}
        value={user.role}
        disabled={pending}
        onChange={(e) => {
          const role = e.target.value;
          startTransition(async () => {
            const res = await changeRole(user.id, role);
            setError(
              res.ok ? null : (res.message ?? "Could not change the role."),
            );
            if (res.ok) {
              await router.invalidate();
            }
          });
        }}
        className="h-8 w-28 rounded-lg border border-input bg-transparent px-2 text-sm"
        title={isSelf ? "Your own role; another admin must remain" : undefined}
      >
        {roles.map((r) => (
          <option key={r.key} value={r.key}>
            {r.name}
          </option>
        ))}
      </select>
      {error && (
        <span className="max-w-48 text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}

// Edit, enable/disable and delete for one row
export function UserActions({ user, isSelf }: { user: User; isSelf: boolean }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const disabled = user.status === "disabled";

  const run = (action: () => Promise<UserActionState>, close = false) =>
    startTransition(async () => {
      const res = await action();
      setError(res.ok ? null : (res.message ?? "Something went wrong."));
      if (res.ok && close) {
        setDialog(null);
      }
      if (res.ok) {
        await router.invalidate();
      }
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${user.displayName}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={() => setDialog("edit")}>
            <Pencil /> Edit name
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending || isSelf}
            onSelect={() =>
              run(() => setStatus(user.id, disabled ? "active" : "disabled"))
            }
          >
            {disabled ? (
              <>
                <CircleCheck /> Enable
              </>
            ) : (
              <>
                <Ban /> Disable
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={isSelf}
            onSelect={() => {
              setError(null);
              setDialog("delete");
            }}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && dialog === null && (
        <p role="alert" className="mt-1 max-w-48 text-xs text-destructive">
          {error}
        </p>
      )}

      <EditDialog
        user={user}
        open={dialog === "edit"}
        onOpenChange={(open) => setDialog(open ? "edit" : null)}
      />

      <Dialog
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {user.displayName}?</DialogTitle>
            <DialogDescription>
              They can no longer sign in, and their personal data (name, email,
              avatar) is removed. Their posts and files stay, without an author.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => deleteUser(user.id), true)}
            >
              {pending ? "Deleting…" : "Delete user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<UserActionState>({});
  const [pending, setPending] = useState(false);
  // Submitted by hand, so a failed save keeps what was typed
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const res = await renameUser(new FormData(e.currentTarget));
    setPending(false);
    setState(res);
    if (res.ok) {
      onOpenChange(false);
      await router.invalidate();
    }
  };
  const fieldError = (name: string) => state.fieldErrors?.[name];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form noValidate onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Edit {user.displayName}</DialogTitle>
            <DialogDescription>{user.email}</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <input type="hidden" name="id" value={user.id} />
            {state.message && !state.ok && (
              <Alert variant="destructive">
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}
            <Field data-invalid={!!fieldError("displayName") || undefined}>
              <FieldLabel htmlFor={`name-${user.id}`}>Name</FieldLabel>
              <Input
                id={`name-${user.id}`}
                name="displayName"
                aria-invalid={!!fieldError("displayName") || undefined}
                defaultValue={user.displayName}
              />
              <FieldError>{fieldError("displayName")}</FieldError>
            </Field>
            <Field data-invalid={!!fieldError("shortName") || undefined}>
              <FieldLabel htmlFor={`short-${user.id}`}>Short name</FieldLabel>
              <Input
                id={`short-${user.id}`}
                name="shortName"
                aria-invalid={!!fieldError("shortName") || undefined}
                defaultValue={user.shortName ?? ""}
                placeholder="Shown in greetings and menus"
              />
              <FieldError>{fieldError("shortName")}</FieldError>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
