import { Alert, AlertDescription } from "@packages/ui/components/alert";
import { Button } from "@packages/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@packages/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@packages/ui/components/field";
import { Input } from "@packages/ui/components/input";
import { useRouter } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { RoleView } from "@/lib/types";
import { createUser, type UserActionState } from "./actions";

export function NewUserDialog({ roles }: { roles: RoleView[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, setState] = useState<UserActionState>({});
  const [pending, setPending] = useState(false);
  // Closes on success; the list refreshes. Submitted by hand, so a failed
  // save keeps what was typed.
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const res = await createUser(new FormData(e.currentTarget));
    setPending(false);
    setState(res);
    if (res.ok) {
      setOpen(false);
      await router.invalidate();
    }
  };
  const fieldError = (name: string) => state.fieldErrors?.[name];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus /> New user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form noValidate onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New user</DialogTitle>
            <DialogDescription>
              They sign in with this email and password, and can change the
              password later.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            {state.message && !state.ok && (
              <Alert variant="destructive">
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}
            <Field data-invalid={!!fieldError("displayName") || undefined}>
              <FieldLabel htmlFor="new-name">Name</FieldLabel>
              <Input
                id="new-name"
                name="displayName"
                aria-invalid={!!fieldError("displayName") || undefined}
                autoComplete="off"
              />
              <FieldError>{fieldError("displayName")}</FieldError>
            </Field>
            <Field data-invalid={!!fieldError("email") || undefined}>
              <FieldLabel htmlFor="new-email">Email</FieldLabel>
              <Input
                id="new-email"
                name="email"
                aria-invalid={!!fieldError("email") || undefined}
                type="email"
                autoComplete="off"
              />
              <FieldError>{fieldError("email")}</FieldError>
            </Field>
            <Field data-invalid={!!fieldError("password") || undefined}>
              <FieldLabel htmlFor="new-password">Password</FieldLabel>
              <Input
                id="new-password"
                name="password"
                aria-invalid={!!fieldError("password") || undefined}
                type="password"
                autoComplete="new-password"
              />
              <FieldDescription>8 to 256 characters.</FieldDescription>
              <FieldError>{fieldError("password")}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="new-role">Role</FieldLabel>
              <select
                id="new-role"
                name="role"
                defaultValue="author"
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                {roles.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.name}
                    {r.description ? `: ${r.description}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
