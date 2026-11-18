import { Alert, AlertDescription } from "@packages/ui/components/alert";
import { Button } from "@packages/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@packages/ui/components/field";
import { Input } from "@packages/ui/components/input";
import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import {
  type EditorVariant,
  RichTextEditor,
} from "@/components/rich-text-editor";

// TEMPORARY: lets you try every editor variant here; remove the switcher
// (keep "standard") once one is chosen
const VARIANTS: EditorVariant[] = [
  "standard",
  "basic",
  "minimal",
  "full",
];

import { type CreateMessageState, createMessage } from "./actions";
import { STATUS_LABEL, STATUSES } from "./status";

// A message staff add by hand, e.g. from a phone call or an email to
// someone; the message is rich text (the public users' editor)
export function NewMessageForm() {
  const navigate = useNavigate();
  const [state, setState] = useState<CreateMessageState>({});
  const [pending, setPending] = useState(false);
  const [variant, setVariant] = useState<EditorVariant>("standard");
  // Carried across variant switches, which remount the editor
  const [html, setHtml] = useState("");
  // Submitted by hand, so a failed save keeps what was typed; opens the
  // message once saved
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const res = await createMessage(new FormData(e.currentTarget));
    if (res.id) {
      await navigate({
        to: "/admin/contact/$id",
        params: {
          id: res.id,
        },
      });
      return;
    }
    setPending(false);
    setState(res);
  };
  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex max-w-3xl flex-col gap-6 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
    >
      {state.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" name="name" maxLength={255} />
          </Field>
          <Field>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <select
              id="status"
              name="status"
              defaultValue="read"
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" name="email" type="email" maxLength={320} />
          </Field>
          <Field>
            <FieldLabel htmlFor="phone">Phone</FieldLabel>
            <Input id="phone" name="phone" type="tel" maxLength={50} />
          </Field>
        </div>
        <FieldDescription>An email or a phone is required.</FieldDescription>
        <Field>
          <FieldLabel htmlFor="subject">Subject</FieldLabel>
          <Input id="subject" name="subject" maxLength={255} />
        </Field>
        <Field>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FieldLabel>Message</FieldLabel>
            {/* TEMPORARY: variant switcher for testing */}
            <div
              role="group"
              aria-label="Editor variant (testing)"
              className="flex items-center gap-1 text-xs"
            >
              <span className="text-muted-foreground">Editor:</span>
              {VARIANTS.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={variant === name}
                  onClick={() => setVariant(name)}
                  className="rounded-md border px-2 py-0.5 aria-pressed:bg-muted aria-pressed:font-medium"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <RichTextEditor
            // TinyMCE reads its setup once: remount per variant
            key={variant}
            name="message"
            initialValue={html}
            onChange={setHtml}
            variant={variant}
            height={320}
          />
        </Field>
      </FieldGroup>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add message"}
        </Button>
      </div>
    </form>
  );
}
