import { Alert, AlertDescription } from "@packages/ui/components/alert";
import { Badge } from "@packages/ui/components/badge";
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
import { cn } from "@packages/ui/lib/utils";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { ExternalLink, ImageUp, RefreshCw, Undo2, X } from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  CameraDialog,
  IMAGE_TYPES,
  type ImageSource,
  ImageSourceMenu,
  useObjectUrls,
} from "@/components/image-source";
import { useLightbox } from "@/components/lightbox/use-lightbox";
import { useMediaPicker } from "@/components/media-picker";
import { RichTextEditor } from "@/components/rich-text-editor";
import { notify } from "@/components/toast";
import { useFileDrop } from "@/lib/admin/use-file-drop";
import type { Post, PostOption } from "@/lib/types";
import {
  ensurePostFolder,
  type PostState,
  publishPost,
  removePost,
  saveCover,
  savePost,
  unpublishPost,
  uploadPostImage,
} from "./actions";
import { EditorVariantsTest } from "./editor-variants-test";

// The public site, for "View on site" (the panel runs at its own origin)
const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "").replace(/\/+$/, "");

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm";

// A blank post for /posts/new: no id until the first save creates it
export const NEW_POST: Post = {
  id: "",
  parentId: null,
  authorId: null,
  title: "",
  slug: null,
  path: null,
  description: null,
  tags: [],
  status: "draft",
  publishedAt: null,
  live: false,
  createdAt: "",
  updatedAt: "",
  content: "",
  cover: null,
  translations: [],
};

// Edits a post, or starts a new one (post.id empty): saving creates it.
// Content, the cover, publishing and delete need the post, so a new one
// gets them after its first save.
export function PostEditor({
  post,
  options,
  canPublish,
  error,
}: {
  post: Post;
  options: PostOption[];
  canPublish: boolean;
  // From creating: the post was made but the rest didn't save
  error?: string;
}) {
  const isNew = !post.id;
  const router = useRouter();
  const navigate = useNavigate();
  const [saved, setSaved] = useState<PostState>(
    error
      ? {
          message: `Created, but not everything was saved: ${error}`,
        }
      : {},
  );
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<PostState>({});
  // Files of this post only: its folder in the media library
  const resolveScope = useCallback(async () => {
    const { folderId, message } = await ensurePostFolder(post.id);
    return folderId
      ? {
          folderId,
          label: "This post",
        }
      : {
          error: `Couldn't open this post's files: ${message ?? "unknown error"}`,
        };
  }, [
    post.id,
  ]);
  const picker = useMediaPicker({
    resolveScope,
  });
  const [pending, startTransition] = useTransition();
  // A sidebar action; a success re-runs the loader (fresh editor state)
  const run = (action: () => Promise<PostState>) =>
    startTransition(async () => {
      const res = await action();
      setResult(res);
      if (res.ok) {
        await router.invalidate();
      }
    });

  // Keeps what was typed when the save fails (no form reset). Creating
  // opens the new post's editor, with the error when the rest didn't save.
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(e.currentTarget, submitter);
    setSaving(true);
    const res = await savePost(data);
    setSaving(false);
    if (res.createdId) {
      await navigate({
        to: "/admin/posts/$id",
        params: {
          id: res.createdId,
        },
        search: res.ok
          ? {}
          : {
              error: res.message ?? "",
            },
      });
      return;
    }
    setSaved(res);
    if (res.ok) {
      await router.invalidate();
    }
  };

  // A post can't go under itself; the api also refuses its descendants
  const parents = options.filter((o) => o.id !== post.id);
  const message = result.message ?? saved.message;
  const failed = result.message ? !result.ok : !!saved.message && !saved.ok;
  const fieldError = (name: string) => saved.fieldErrors?.[name];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <form
        noValidate
        onSubmit={save}
        className="flex min-w-0 flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
      >
        <input type="hidden" name="id" value={post.id} />
        <input
          type="hidden"
          name="currentParentId"
          value={post.parentId ?? ""}
        />
        {message && (
          <Alert variant={failed ? "destructive" : "default"}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        <FieldGroup>
          <Field data-invalid={!!fieldError("title") || undefined}>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input
              id="title"
              name="title"
              aria-invalid={!!fieldError("title") || undefined}
              defaultValue={post.title}
              autoFocus={isNew}
              placeholder="Post title"
              className="text-lg"
            />
            <FieldError>{fieldError("title")}</FieldError>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!fieldError("slug") || undefined}>
              <FieldLabel htmlFor="slug">Slug</FieldLabel>
              <Input
                id="slug"
                name="slug"
                aria-invalid={!!fieldError("slug") || undefined}
                defaultValue={post.slug ?? ""}
                placeholder="e.g. travel/paris"
              />
              <FieldDescription>
                {post.path
                  ? `URL: /${post.path}`
                  : "No URL yet. Needed to publish."}
              </FieldDescription>
              <FieldError>{fieldError("slug")}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="parentId">Parent post</FieldLabel>
              <select
                id="parentId"
                name="parentId"
                defaultValue={post.parentId ?? ""}
                className={selectClass}
              >
                <option value="">None (top level)</option>
                {parents.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.path ? `/${o.path}` : `${o.title} (no URL)`}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field data-invalid={!!fieldError("description") || undefined}>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <textarea
              id="description"
              name="description"
              aria-invalid={!!fieldError("description") || undefined}
              defaultValue={post.description ?? ""}
              maxLength={500}
              rows={2}
              className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm"
            />
            <FieldDescription>
              Excerpt and search-result snippet; about 160 characters show.
            </FieldDescription>
            <FieldError>{fieldError("description")}</FieldError>
          </Field>
          <Field data-invalid={!!fieldError("tags") || undefined}>
            <FieldLabel htmlFor="tags">Tags</FieldLabel>
            <Input
              id="tags"
              name="tags"
              aria-invalid={!!fieldError("tags") || undefined}
              defaultValue={post.tags.map((t) => t.name).join(", ")}
              placeholder="Travel, Food"
            />
            <FieldDescription>
              Comma separated, up to 10; each has a page at /posts/tags/…. New tags
              need an editor or admin.
            </FieldDescription>
            <FieldError>{fieldError("tags")}</FieldError>
          </Field>
          {/* The content comes after the first save, when its images and
					    files have the post's folder to go into */}
          {!isNew && (
            <RichTextEditor
              name="content"
              initialValue={post.content}
              onUploadImage={(file) => uploadPostImage(post.id, file)}
              filePicker={picker.open}
            />
          )}
        </FieldGroup>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>

      {picker.element}
      {isNew ? (
        <aside>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Status <Badge variant="outline">Not saved</Badge>
              </CardTitle>
              <CardDescription>
                Nothing is created until you save. Then you write the content,
                add a cover image{canPublish ? " and publish it" : ""}.
              </CardDescription>
            </CardHeader>
          </Card>
        </aside>
      ) : (
        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Status <StatusBadge post={post} />
              </CardTitle>
              <CardDescription>
                {post.publishedAt
                  ? `${post.live ? "Live since" : "Goes live"} ${new Date(post.publishedAt).toLocaleString()}`
                  : "Not published."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {post.live && post.path && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`${SITE_URL}/${post.path}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink /> View on site
                  </a>
                </Button>
              )}
              {canPublish ? (
                <PublishControls post={post} pending={pending} run={run} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  An editor publishes your post.
                </p>
              )}
            </CardContent>
          </Card>

          <CoverCard
            // Remounts with empty inputs once the new cover is saved
            key={post.cover?.assetId ?? "none"}
            post={post}
            pending={pending}
            picker={picker}
          />

          <Card>
            <CardContent className="flex justify-end">
              <Button
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() => {
                  if (confirm(`Delete “${post.title}”?`)) {
                    startTransition(async () => {
                      const res = await removePost(post.id);
                      if (res.ok) {
                        await navigate({
                          to: "/admin/posts",
                        });
                      } else {
                        setResult(res);
                      }
                    });
                  }
                }}
              >
                Delete post
              </Button>
            </CardContent>
          </Card>
        </aside>
      )}
      {/* TEMPORARY: the public users' editor, to try it out */}
      {!isNew && (
        <div className="lg:col-start-1">
          <EditorVariantsTest
            onUploadImage={(file) => uploadPostImage(post.id, file)}
            filePicker={picker.open}
          />
        </div>
      )}
    </div>
  );
}

function PublishControls({
  post,
  pending,
  run,
}: {
  post: Post;
  pending: boolean;
  run: (action: () => Promise<PostState>) => void;
}) {
  const [at, setAt] = useState("");
  return (
    <>
      <Button
        size="sm"
        disabled={pending}
        onClick={() => run(() => publishPost(post.id))}
      >
        {post.status === "draft" ? "Publish now" : "Republish now"}
      </Button>
      <div className="flex gap-2">
        <Input
          type="datetime-local"
          aria-label="Publish at"
          value={at}
          onChange={(e) => setAt(e.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={pending || !at}
          onClick={() => run(() => publishPost(post.id, at))}
        >
          Schedule
        </Button>
      </div>
      {post.status !== "draft" && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => unpublishPost(post.id))}
        >
          Unpublish
        </Button>
      )}
    </>
  );
}

// What Save will do: one pending change, from any image source
type CoverChange =
  | {
      kind: "file";
      file: File;
      url: string;
    }
  | {
      kind: "url";
      url: string;
    }
  | {
      kind: "asset";
      id: string;
      url: string;
    }
  | {
      kind: "remove";
    };

function CoverCard({
  post,
  pending,
  picker,
}: {
  post: Post;
  pending: boolean;
  picker: ReturnType<typeof useMediaPicker>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [change, setChange] = useState<CoverChange | null>(null);
  const previewOf = useObjectUrls();
  const removing = change?.kind === "remove";
  const chosen = change && change.kind !== "remove" ? change : null;
  const shown = chosen?.url ?? post.cover?.url ?? null;
  const lightbox = useLightbox(shown ?? "");
  const disabled = pending || busy;

  const save = async () => {
    if (!change) {
      return;
    }
    const data = new FormData();
    data.set("id", post.id);
    if (change.kind === "file") {
      data.set("coverFile", change.file, change.file.name);
    } else if (change.kind === "url") {
      data.set("coverUrl", change.url);
    } else if (change.kind === "asset") {
      data.set("coverAssetId", change.id);
    } else {
      data.set("remove", "1");
    }
    setBusy(true);
    const res = await saveCover(data);
    setBusy(false);
    notify(res.ok ? (res.message ?? "Saved") : "Couldn't change the cover", {
      kind: res.ok ? "success" : "error",
      description: res.ok
        ? undefined
        : (res.fieldErrors?.coverUrl ?? res.message),
    });
    if (res.ok) {
      // The card remounts (keyed by the cover) with no change
      await router.invalidate();
    }
  };

  // Upload / Camera / Link / From library, like a product cover; Save
  // applies it
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const drop = useFileDrop((file) => upload(file), IMAGE_TYPES, disabled);
  const choose = async (source: ImageSource) => {
    setLinkError(null);
    if (source === "upload") {
      fileInput.current?.click();
    } else if (source === "camera") {
      setCameraOpen(true);
    } else if (source === "link") {
      setLinkOpen(true);
    } else {
      const file = await picker.open("image");
      if (file) {
        setChange({
          kind: "asset",
          id: file.id,
          url: file.url,
        });
      }
    }
  };
  // Kept in the browser until Save
  const upload = (file: File) =>
    setChange({
      kind: "file",
      file,
      url: previewOf(file),
    });
  const addLink = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const url = String(new FormData(e.currentTarget).get("url") ?? "").trim();
    if (
      !/^https?:\/\/\S+$/i.test(url) ||
      !URL.canParse(url) ||
      url.length > 2048
    ) {
      setLinkError("Enter an http or https URL.");
      return;
    }
    setLinkOpen(false);
    setChange({
      kind: "url",
      url,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cover image</CardTitle>
        <CardDescription>Header image and link preview.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="relative" {...drop.props}>
          {shown ? (
            <a
              href={shown}
              data-gallery={lightbox}
              aria-label="View the cover full size"
              className="block aspect-video w-full cursor-zoom-in overflow-hidden rounded-md border bg-muted"
            >
              {/* User content: /serve, an external link or the chosen file */}
              <img
                src={shown}
                alt=""
                className={cn(
                  "size-full object-cover transition",
                  removing && "opacity-30 grayscale",
                )}
              />
            </a>
          ) : (
            <ImageSourceMenu label="Add cover" align="start" onChoose={choose}>
              <button
                type="button"
                disabled={disabled}
                className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <ImageUp className="size-5" />
                Add cover
                <span className="text-xs">or drop an image here</span>
              </button>
            </ImageSourceMenu>
          )}
          {drop.over && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-background/70 text-sm font-medium ring-1 ring-primary">
              Drop to use this image
            </div>
          )}
          {chosen && (
            <Badge className="absolute top-2 left-2 shadow-sm">Unsaved</Badge>
          )}
          {shown && (
            <div className="absolute -top-2 -right-2 flex gap-1">
              <ImageSourceMenu
                label="Replace with"
                align="end"
                onChoose={choose}
              >
                <Button
                  variant="secondary"
                  size="icon-xs"
                  aria-label="Replace cover"
                  title="Replace cover"
                  className="rounded-full border shadow-sm"
                  disabled={disabled}
                >
                  <RefreshCw />
                </Button>
              </ImageSourceMenu>
              {removing ? (
                <Button
                  variant="secondary"
                  size="icon-xs"
                  aria-label="Restore cover"
                  title="Restore cover"
                  disabled={disabled}
                  onClick={() => setChange(null)}
                  className="rounded-full border shadow-sm"
                >
                  <Undo2 />
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="icon-xs"
                  aria-label={chosen ? "Discard new image" : "Remove cover"}
                  title={chosen ? "Discard new image" : "Remove cover"}
                  disabled={disabled}
                  // A new image is dropped; the saved cover is marked
                  onClick={() =>
                    setChange(
                      chosen
                        ? null
                        : {
                            kind: "remove",
                          },
                    )
                  }
                  className="rounded-full border shadow-sm"
                >
                  <X />
                </Button>
              )}
            </div>
          )}
        </div>
        {linkOpen && (
          <form noValidate onSubmit={addLink} className="flex flex-col gap-1.5">
            <div className="flex flex-wrap justify-end gap-2">
              <Input
                className="basis-full"
                name="url"
                type="url"
                autoFocus
                placeholder="https://example.com/image.jpg"
                aria-label="Cover image URL"
                aria-invalid={!!linkError || undefined}
                aria-describedby={linkError ? "cover-link-error" : undefined}
                onChange={() => setLinkError(null)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLinkOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={disabled}>
                Use
              </Button>
            </div>
            {linkError ? (
              <p id="cover-link-error" className="text-sm text-destructive">
                {linkError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Shown from its own site; nothing is copied.
              </p>
            )}
          </form>
        )}
        <Button
          size="sm"
          disabled={disabled || !change}
          onClick={save}
          className="self-end"
        >
          {busy ? "Saving…" : "Save"}
        </Button>
        {/* For Upload: the new cover */}
        <input
          ref={fileInput}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            // The same file can be chosen again later
            e.currentTarget.value = "";
            if (file) {
              upload(file);
            }
          }}
        />
        <CameraDialog
          open={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onCapture={(file) => {
            setCameraOpen(false);
            upload(file);
          }}
        />
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ post }: { post: Pick<Post, "status" | "live"> }) {
  if (post.status === "draft") {
    return <Badge variant="outline">Draft</Badge>;
  }
  if (!post.live) {
    return <Badge variant="secondary">Scheduled</Badge>;
  }
  return <Badge>Published</Badge>;
}
