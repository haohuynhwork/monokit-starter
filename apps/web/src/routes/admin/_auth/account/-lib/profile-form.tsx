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
import { useRouter } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { type ProfileState, updateProfile } from "./actions";

export type ProfileNames = {
  displayName: string;
  shortName: string | null;
  givenName: string | null;
  familyName: string | null;
};

const fields = [
  {
    name: "displayName",
    label: "Display name",
    autoComplete: "name",
  },
  {
    name: "shortName",
    label: "Short name",
    autoComplete: "nickname",
    description: "Shown in the header. Optional.",
  },
  {
    name: "givenName",
    label: "Given name",
    autoComplete: "given-name",
  },
  {
    name: "familyName",
    label: "Family name",
    autoComplete: "family-name",
  },
] as const;

export function ProfileForm({ names }: { names: ProfileNames }) {
  const router = useRouter();
  const [state, setState] = useState<ProfileState>({});
  const [pending, setPending] = useState(false);
  // Submitted by hand, so a failed save keeps what was typed
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const res = await updateProfile(new FormData(e.currentTarget));
    setPending(false);
    setState(res);
    if (res.ok) {
      // The header's name too
      await router.invalidate();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Names</CardTitle>
        <CardDescription>How you appear on Monokit.</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={submit}>
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
                    defaultValue={names[f.name] ?? ""}
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
              {pending ? "Saving…" : "Save names"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
