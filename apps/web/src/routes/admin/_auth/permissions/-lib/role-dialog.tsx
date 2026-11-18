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
import { Pencil, Plus } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import type { FormState } from "@/lib/api";
import type { Permissions, RoleView } from "@/lib/types";
import { saveRole } from "./actions";

// Create (no `role`) or edit a custom role
export function RoleDialog({
  role,
  permissions,
}: {
  role?: RoleView;
  permissions: Permissions["permissions"];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, setState] = useState<FormState>({});
  const [pending, setPending] = useState(false);
  const groups = [
    ...new Set(permissions.map((p) => p.group)),
  ];
  const fieldError = (name: string) => state.fieldErrors?.[name];

  // Submitted by hand, so a failed save keeps what was typed
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const res = await saveRole(role?.id ?? null, new FormData(e.currentTarget));
    setPending(false);
    setState(res);
    if (res.ok) {
      setOpen(false);
      await router.invalidate();
    }
  };

  const trigger: ReactNode = role ? (
    <Button variant="ghost" size="sm">
      <Pencil /> Edit
    </Button>
  ) : (
    <Button size="sm">
      <Plus /> New role
    </Button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setState({});
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form noValidate onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{role ? `Edit ${role.name}` : "New role"}</DialogTitle>
            <DialogDescription>
              Pick what people with this role may do.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            {state.message && !state.ok && !state.fieldErrors && (
              <Alert variant="destructive">
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}
            <Field data-invalid={!!fieldError("name") || undefined}>
              <FieldLabel htmlFor="role-name">Name</FieldLabel>
              <Input
                id="role-name"
                name="name"
                defaultValue={role?.name}
                aria-invalid={!!fieldError("name") || undefined}
                autoComplete="off"
              />
              <FieldError>{fieldError("name")}</FieldError>
            </Field>
            {!role && (
              <Field data-invalid={!!fieldError("key") || undefined}>
                <FieldLabel htmlFor="role-key">Key</FieldLabel>
                <Input
                  id="role-key"
                  name="key"
                  placeholder="moderator"
                  aria-invalid={!!fieldError("key") || undefined}
                  autoComplete="off"
                />
                <FieldDescription>
                  Fixed once created. Use 2 to 50 characters.
                </FieldDescription>
                <FieldError>{fieldError("key")}</FieldError>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="role-description">Description</FieldLabel>
              <Input
                id="role-description"
                name="description"
                defaultValue={role?.description ?? ""}
                autoComplete="off"
              />
            </Field>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-sm font-medium">Permissions</legend>
              {groups.map((group) => (
                <div key={group} className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {group}
                  </p>
                  {permissions
                    .filter((p) => p.group === group)
                    .map((p) => (
                      <label
                        key={p.key}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          name="permissions"
                          value={p.key}
                          defaultChecked={role?.permissions.includes(p.key)}
                        />
                        {p.label}
                        <code className="text-xs text-muted-foreground">
                          {p.key}
                        </code>
                      </label>
                    ))}
                </div>
              ))}
            </fieldset>
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
