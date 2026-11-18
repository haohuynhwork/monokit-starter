import { Alert, AlertDescription } from "@packages/ui/components/alert";
import { Button } from "@packages/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@packages/ui/components/field";
import { Input } from "@packages/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@packages/ui/components/input-group";
import { Link } from "@tanstack/react-router";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { type ComponentProps, type FormEvent, useState } from "react";
import type { AuthResult } from "@/lib/site/site-session";

export type AuthFieldSpec = {
  name: string;
  label: string;
  type: "email" | "password" | "text";
  autoComplete: string;
  // A link beside the label, e.g. "Forgot password?"
  link?: {
    to: string;
    label: string;
  };
};

// Shared by /auth/login, /auth/register, /auth/forgot-password and /auth/reset-password.
// onSubmit calls the api and returns errors or a notice; on success it
// navigates itself.
export function AuthForm({
  title,
  description,
  onSubmit,
  fields,
  submitLabel,
  footer,
  notice,
}: {
  title: string;
  description: string;
  onSubmit: (values: Record<string, string>) => Promise<AuthResult>;
  fields: AuthFieldSpec[];
  submitLabel: string;
  footer: {
    text: string;
    to: string;
    search?: Record<string, string | undefined>;
    link: string;
  };
  // Shown until the form answers, e.g. "Password changed" on /login
  notice?: string;
}) {
  const [state, setState] = useState<AuthResult>({});
  const [pending, setPending] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const values: Record<string, string> = {};
    for (const f of fields) {
      values[f.name] = String(data.get(f.name) ?? "");
    }
    setPending(true);
    const res = await onSubmit(values);
    setPending(false);
    setState(res);
  };

  const shownNotice = state.notice ?? notice;
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} noValidate>
            <FieldGroup>
              {state.message ? (
                <Alert variant="destructive">
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              ) : (
                shownNotice && (
                  <Alert role="status">
                    <AlertDescription>{shownNotice}</AlertDescription>
                  </Alert>
                )
              )}
              {fields.map((f) => {
                const error = state.fieldErrors?.[f.name];
                const id = `field-${f.name}`;
                return (
                  <Field key={f.name} data-invalid={!!error || undefined}>
                    {f.link ? (
                      <div className="flex items-center justify-between">
                        <FieldLabel htmlFor={id}>{f.label}</FieldLabel>
                        <Link
                          to={f.link.to}
                          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                        >
                          {f.link.label}
                        </Link>
                      </div>
                    ) : (
                      <FieldLabel htmlFor={id}>{f.label}</FieldLabel>
                    )}
                    {f.type === "password" ? (
                      <PasswordInput
                        id={id}
                        name={f.name}
                        autoComplete={f.autoComplete}
                        aria-invalid={!!error || undefined}
                      />
                    ) : (
                      <Input
                        id={id}
                        name={f.name}
                        type={f.type}
                        autoComplete={f.autoComplete}
                        aria-invalid={!!error || undefined}
                      />
                    )}
                    {error && <FieldError>{error}</FieldError>}
                  </Field>
                );
              })}
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Please wait…" : submitLabel}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          {footer.text}&nbsp;
          <Link
            to={footer.to}
            search={footer.search as never}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {footer.link}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

// A password field with a show / hide toggle
function PasswordInput(props: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <InputGroup>
      <InputGroupInput {...props} type={visible ? "text" : "password"} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
