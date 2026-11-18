import { Alert, AlertDescription } from "@packages/ui/components/alert";
import { Button } from "@packages/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@packages/ui/components/field";
import { Input } from "@packages/ui/components/input";
import { type FormEvent, useState } from "react";
import { type ChangePasswordState, changePassword } from "./actions";

const fields = [
  {
    name: "currentPassword",
    label: "Current password",
    autoComplete: "current-password",
  },
  {
    name: "newPassword",
    label: "New password",
    autoComplete: "new-password",
    description: "8 to 256 characters.",
  },
  {
    name: "confirmPassword",
    label: "Confirm new password",
    autoComplete: "new-password",
  },
] as const;

export function ChangePasswordForm() {
  const [state, setState] = useState<ChangePasswordState>({});
  const [pending, setPending] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setState(await changePassword(new FormData(e.currentTarget)));
    setPending(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Change password</CardTitle>
        <CardDescription>
          You stay signed in on this device after changing it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* key: a fresh, empty form after a successful change */}
        <form noValidate onSubmit={submit} key={state.ok ? "done" : "form"}>
          <FieldGroup>
            {state.message && (
              <Alert variant={state.ok ? "default" : "destructive"}>
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}
            {fields.map((f) => {
              const error = state.fieldErrors?.[f.name];
              const id = `field-${f.name}`;
              return (
                <Field key={f.name} data-invalid={!!error || undefined}>
                  <FieldLabel htmlFor={id}>{f.label}</FieldLabel>
                  <Input
                    id={id}
                    name={f.name}
                    type="password"
                    autoComplete={f.autoComplete}
                    aria-invalid={!!error || undefined}
                  />
                  {"description" in f && !error && (
                    <FieldDescription>{f.description}</FieldDescription>
                  )}
                  {error && <FieldError>{error}</FieldError>}
                </Field>
              );
            })}
            <Button type="submit" disabled={pending} className="w-fit self-end">
              {pending ? "Saving…" : "Change password"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
