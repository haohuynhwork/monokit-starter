import { Alert, AlertDescription } from "@packages/ui/components/alert";
import { Button } from "@packages/ui/components/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@packages/ui/components/field";
import { Input } from "@packages/ui/components/input";
import { Textarea } from "@packages/ui/components/textarea";
import { type FormEvent, useState } from "react";
import { type ContactState, checkContact, sendContact } from "./contact-action";

const LABELS = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  subject: "Subject",
  message: "Message",
} as const;

type FieldName = keyof typeof LABELS;

export function ContactForm({
  pageId,
  blockId,
  title,
  fields,
}: {
  pageId: string;
  blockId: string;
  title?: string;
  fields: FieldName[];
}) {
  const [state, setState] = useState<ContactState>({});
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const values: Record<string, string> = {};
    for (const f of fields) {
      values[f] = String(form.get(f) ?? "");
    }
    const invalid = checkContact(values);
    if (Object.keys(invalid).length) {
      setState({
        fieldErrors: invalid,
      });
      return;
    }
    setPending(true);
    try {
      setState(
        await sendContact({
          data: {
            pageId,
            blockId,
            fields: values,
            website: String(form.get("website") ?? ""),
          },
        }),
      );
    } catch {
      setState({
        message: "Couldn't send your message.",
      });
    } finally {
      setPending(false);
    }
  }

  if (state.ok) {
    return (
      <Alert>
        <AlertDescription>Thanks! Your message was sent.</AlertDescription>
      </Alert>
    );
  }
  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {title && <h2 className="text-xl font-semibold">{title}</h2>}
      {state.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      {/* Honeypot: hidden from people, filled by bots */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />
      <FieldGroup>
        {fields.map((f) => {
          const error = state.fieldErrors?.[f];
          return (
            <Field key={f} data-invalid={!!error || undefined}>
              <FieldLabel htmlFor={`${blockId}-${f}`}>{LABELS[f]}</FieldLabel>
              {f === "message" ? (
                <Textarea
                  id={`${blockId}-${f}`}
                  name={f}
                  rows={5}
                  maxLength={5000}
                  aria-invalid={!!error || undefined}
                />
              ) : (
                <Input
                  id={`${blockId}-${f}`}
                  name={f}
                  type={
                    f === "email" ? "email" : f === "phone" ? "tel" : "text"
                  }
                  maxLength={f === "name" ? 200 : f === "phone" ? 50 : 255}
                  aria-invalid={!!error || undefined}
                />
              )}
              <FieldError>{error}</FieldError>
            </Field>
          );
        })}
      </FieldGroup>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
