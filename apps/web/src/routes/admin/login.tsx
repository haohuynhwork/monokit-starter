import { Button } from "@packages/ui/components/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@packages/ui/components/field";
import { Input } from "@packages/ui/components/input";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { api, type FormState, toFormState } from "@/lib/api";
import { fetchMe } from "@/lib/auth";

export const Route = createFileRoute("/admin/login")({
  // ?next=/admin/users: where to go after signing in
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  beforeLoad: async ({ search }) => {
    if (await fetchMe()) {
      throw redirect({
        href: safeNext(search.next),
      });
    }
  },
  component: LoginPage,
});

// Only paths on this app (no //evil.example)
const safeNext = (next: string | undefined) =>
  next?.startsWith("/") && !next.startsWith("//") ? next : "/admin";

function LoginPage() {
  const { next } = Route.useSearch();
  const router = useRouter();
  const [state, setState] = useState<FormState>({});
  const [pending, setPending] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const fieldErrors: Record<string, string> = {};
    if (!email) {
      fieldErrors.email = "Enter your email.";
    }
    if (!password) {
      fieldErrors.password = "Enter your password.";
    }
    if (Object.keys(fieldErrors).length) {
      setState({
        fieldErrors,
      });
      return;
    }
    setPending(true);
    const res = await api("/auth/login", {
      method: "POST",
      body: {
        email,
        password,
      },
      silent: true,
    });
    setPending(false);
    if (res.status !== "success") {
      setState(toFormState(res, ""));
      return;
    }
    // The api set the auth cookies; _auth's beforeLoad reads the user
    await router.navigate({
      href: safeNext(next),
    });
  };

  const fieldError = (name: string) => state.fieldErrors?.[name];
  const invalid = (name: string) => !!fieldError(name) || undefined;
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        {state.message && !state.fieldErrors && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}
        <FieldGroup>
          <Field data-invalid={invalid("email")}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              aria-invalid={invalid("email")}
            />
            <FieldError>{fieldError("email")}</FieldError>
          </Field>
          <Field data-invalid={invalid("password")}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={invalid("password")}
            />
            <FieldError>{fieldError("password")}</FieldError>
          </Field>
        </FieldGroup>
        <Button type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
