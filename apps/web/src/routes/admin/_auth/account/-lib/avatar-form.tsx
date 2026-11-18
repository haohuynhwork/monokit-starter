import { Alert, AlertDescription } from "@packages/ui/components/alert";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@packages/ui/components/avatar";
import { Button } from "@packages/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import { FieldError } from "@packages/ui/components/field";
import { useRouter } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { type AvatarState, removeAvatar, uploadAvatar } from "./actions";

// Same rules as the api's AVATAR_POLICY; checked here only for quick feedback
const ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_BYTES = 2 * 1024 * 1024;

export function AvatarForm({
  avatarUrl,
  initials,
}: {
  avatarUrl: string | null;
  initials: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<AvatarState>({});
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Free the preview's object URL when it changes or on unmount
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [
    preview,
  ]);

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);
    setPreview(null);
    if (!file) {
      return;
    }
    if (!ACCEPT.split(",").includes(file.type)) {
      setError("Use a PNG, JPEG or WebP image.");
    } else if (file.size > MAX_BYTES) {
      setError("The image must be 2 MB or smaller.");
    } else {
      setPreview(URL.createObjectURL(file));
    }
  }

  const upload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    const res = await uploadAvatar(new FormData(form));
    setPending(false);
    setState(res);
    setPreview(null);
    // As a form action did: the input empties, so Upload waits for a pick
    form.reset();
    if (res.ok) {
      // The header's avatar too
      await router.invalidate();
    }
  };

  const remove = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await removeAvatar();
    await router.invalidate();
  };

  // Problems with the picked file show under the input; the banner is for
  // the rest
  const fileError = error ?? state.fieldErrors?.file;
  const message = state.message;
  const failed = !state.ok;
  const shown = preview ?? avatarUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Avatar</CardTitle>
        <CardDescription>PNG, JPEG or WebP, up to 2 MB.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {message && (
          <Alert variant={failed ? "destructive" : "default"}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {shown && <AvatarImage src={shown} alt="Avatar" />}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <form
            noValidate
            onSubmit={upload}
            className="flex flex-wrap items-center gap-2"
          >
            <input
              name="file"
              type="file"
              accept={ACCEPT}
              onChange={onPick}
              aria-invalid={!!fileError || undefined}
              aria-describedby={fileError ? "avatar-file-error" : undefined}
              className="max-w-56 text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-2 file:py-1 file:text-sm"
            />
            <Button type="submit" size="sm" disabled={pending || !preview}>
              {pending ? "Uploading…" : "Upload"}
            </Button>
            <FieldError id="avatar-file-error" className="w-full">
              {fileError}
            </FieldError>
          </form>
        </div>
        {avatarUrl && (
          <form noValidate onSubmit={remove}>
            <Button type="submit" variant="outline" size="sm">
              Remove avatar
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
