import { Alert, AlertDescription } from "@packages/ui/components/alert";
import { Button } from "@packages/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@packages/ui/components/field";
import { Input } from "@packages/ui/components/input";
import { useRouter } from "@tanstack/react-router";
import { type FormEvent, useState, useTransition } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import type { Locale, Post } from "@/lib/types";
import {
  deletePostTranslation,
  type PostState,
  savePostTranslation,
  uploadPostImage,
} from "./actions";

// A post's text in one non-default locale (ideas/i18n). Until it is saved,
// that locale shows the default text; the form starts from it to translate.
export function PostTranslationEditor({
  post,
  locale,
}: {
  post: Post;
  locale: Locale;
}) {
  const translation = post.translations.find((t) => t.locale === locale.code);
  const router = useRouter();
  const [saved, setSaved] = useState<PostState>({});
  const [saving, setSaving] = useState(false);
  const [removed, setRemoved] = useState<PostState>({});
  const [pending, startTransition] = useTransition();
  // Keeps what was typed when the save fails (no form reset)
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const res = await savePostTranslation(new FormData(e.currentTarget));
    setSaving(false);
    setSaved(res);
    if (res.ok) {
      await router.invalidate();
    }
  };
  const state = removed.message ? removed : saved;
  const fieldError = (name: string) => saved.fieldErrors?.[name];
  const prefix = locale.code.toLowerCase();

  return (
    <form
      noValidate
      onSubmit={save}
      className="flex min-w-0 flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
      dir={locale.rtl ? "rtl" : undefined}
    >
      <input type="hidden" name="id" value={post.id} />
      <input type="hidden" name="locale" value={locale.code} />
      {state.message && (
        <Alert variant={state.ok ? "default" : "destructive"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      {!translation && (
        <p className="text-sm text-muted-foreground">
          Not translated: {locale.nativeName} visitors see the default text. The
          form starts from it.
        </p>
      )}
      <FieldGroup>
        <Field data-invalid={!!fieldError("title") || undefined}>
          <FieldLabel htmlFor="tr-title">Title</FieldLabel>
          <Input
            id="tr-title"
            aria-invalid={!!fieldError("title") || undefined}
            name="title"
            defaultValue={translation?.title ?? post.title}
            className="text-lg"
          />
          <FieldError>{fieldError("title")}</FieldError>
        </Field>
        <Field data-invalid={!!fieldError("slug") || undefined}>
          <FieldLabel htmlFor="tr-slug">Slug</FieldLabel>
          <Input
            id="tr-slug"
            aria-invalid={!!fieldError("slug") || undefined}
            name="slug"
            defaultValue={translation?.slug ?? ""}
            placeholder={post.slug ?? ""}
          />
          <FieldDescription>
            Empty keeps the post&apos;s own slug.{" "}
            {translation?.path && `URL: /${prefix}/${translation.path}`}
          </FieldDescription>
          <FieldError>{fieldError("slug")}</FieldError>
        </Field>
        <Field data-invalid={!!fieldError("description") || undefined}>
          <FieldLabel htmlFor="tr-description">Description</FieldLabel>
          <textarea
            id="tr-description"
            aria-invalid={!!fieldError("description") || undefined}
            name="description"
            defaultValue={translation?.description ?? post.description ?? ""}
            maxLength={500}
            rows={2}
            className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm"
          />
          <FieldError>{fieldError("description")}</FieldError>
        </Field>
        <RichTextEditor
          name="content"
          initialValue={translation?.content ?? post.content}
          onUploadImage={(file) => uploadPostImage(post.id, file)}
        />
      </FieldGroup>
      <div className="flex justify-end gap-2">
        {translation && (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (confirm(`Remove the ${locale.nativeName} translation?`)) {
                startTransition(async () => {
                  const res = await deletePostTranslation(post.id, locale.code);
                  setRemoved(res);
                  if (res.ok) {
                    await router.invalidate();
                  }
                });
              }
            }}
          >
            Remove translation
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save translation"}
        </Button>
      </div>
    </form>
  );
}
