import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { Textarea } from "@packages/ui/components/textarea";
import { cn } from "@packages/ui/lib/utils";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { GripVertical, ImageUp, Plus, RefreshCw, Undo2, X } from "lucide-react";
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
import { categoryTree } from "@/lib/admin/tree";
import { useFileDrop } from "@/lib/admin/use-file-drop";
import { trackedStock } from "@/lib/product";
import type { ShopActionState } from "@/lib/shop";
import type { Category, GalleryItem, Product } from "@/lib/types";
import {
  addProductPhotoLink,
  deleteProduct,
  ensureProductFolder,
  saveProduct,
  setProductCover,
  setProductGallery,
  uploadProductImage,
  uploadProductPhoto,
} from "./actions";
import { ProductPrice } from "./price-tag";
import { ProductStatusBadge } from "./status-badge";
import { VariantsEditor } from "./variants-editor";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm";

// New (product null) or edit
export function ProductEditor({
  product,
  categories,
  currency,
}: {
  product: Product | null;
  categories: Category[];
  currency: string;
}) {
  const router = useRouter();
  const navigate = useNavigate();
  const [state, setState] = useState<ShopActionState>({});
  const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const res = await saveProduct(new FormData(e.currentTarget));
    setSaving(false);
    setState(res);
    if (!res.ok) {
      return;
    }
    notify(res.message ?? "Saved", {
      kind: "success",
    });
    if (!product && res.data) {
      // Opens the new product
      await navigate({
        to: "/admin/products/$id",
        params: {
          id: res.data.id,
        },
      });
    } else {
      // Re-runs the loader; the page keys the editor on updatedAt
      await router.invalidate();
    }
  };
  const fieldError = (name: string) => state.fieldErrors?.[name];
  const invalid = (name: string) => !!fieldError(name) || undefined;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <form
        noValidate
        onSubmit={submit}
        className="flex min-w-0 flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
      >
        <input type="hidden" name="id" value={product?.id ?? ""} />
        {state.message && !state.ok && !state.fieldErrors && (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
        <FieldGroup>
          <Field data-invalid={invalid("name")}>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              aria-invalid={invalid("name")}
              name="name"
              defaultValue={product?.name}
              className="text-lg"
            />
            <FieldError>{fieldError("name")}</FieldError>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={invalid("slug")}>
              <FieldLabel htmlFor="slug">Slug</FieldLabel>
              <Input
                id="slug"
                aria-invalid={invalid("slug")}
                name="slug"
                defaultValue={product?.slug}
                placeholder="e.g. blue-shirt"
              />
              <FieldError>{fieldError("slug")}</FieldError>
            </Field>
            <Field data-invalid={invalid("categoryId")}>
              <FieldLabel htmlFor="categoryId">Category</FieldLabel>
              <select
                id="categoryId"
                aria-invalid={invalid("categoryId")}
                name="categoryId"
                defaultValue={product?.categoryId ?? ""}
                className={selectClass}
              >
                <option value="">None</option>
                {categoryTree(categories).map((c) => (
                  <option key={c.id} value={c.id}>
                    {"— ".repeat(c.depth)}
                    {c.name}
                  </option>
                ))}
              </select>
              <FieldError>{fieldError("categoryId")}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="status">Status</FieldLabel>
              <select
                id="status"
                name="status"
                defaultValue={product?.status ?? "draft"}
                className={selectClass}
              >
                <option value="draft">Draft</option>
                <option value="active">Active (in the shop)</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
          </div>
          <VariantsEditor
            product={product}
            currency={currency}
            fieldErrors={state.fieldErrors}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SaleTime
              name="saleStartsAt"
              error={fieldError("saleStartsAt")}
              label="Sale starts"
              value={product?.sale?.startsAt ?? null}
              hint="For every variant's sale price. Blank: now."
            />
            <SaleTime
              name="saleEndsAt"
              error={fieldError("saleEndsAt")}
              label="Sale ends"
              value={product?.sale?.endsAt ?? null}
              hint="Blank: until removed."
            />
          </div>
          <Field data-invalid={invalid("description")}>
            <FieldLabel htmlFor="description">Summary</FieldLabel>
            <textarea
              id="description"
              aria-invalid={invalid("description")}
              name="description"
              rows={2}
              maxLength={500}
              defaultValue={product?.description ?? ""}
              className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm"
            />
            <FieldDescription>
              Short text for listings and search results; about 160 characters
              show.
            </FieldDescription>
            <FieldError>{fieldError("description")}</FieldError>
          </Field>
          <Field>
            <FieldLabel>Content</FieldLabel>
            {product ? (
              <ProductContent product={product} />
            ) : (
              <>
                <RichTextEditor name="content" initialValue="" />
                <FieldDescription>
                  Images can be added once the product is created.
                </FieldDescription>
              </>
            )}
          </Field>
        </FieldGroup>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>

      {product && (
        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Status <ProductStatusBadge status={product.status} />
              </CardTitle>
              <CardDescription>
                <ProductPrice product={product} currency={currency} /> ·{" "}
                {product.variants.length > 1 &&
                  `${product.variants.length} variants · `}
                {trackedStock(product) !== null
                  ? `${trackedStock(product)} in stock`
                  : "stock not tracked"}
                {product.rating.count > 0 &&
                  ` · ★ ${product.rating.average?.toFixed(1)} (${product.rating.count})`}
              </CardDescription>
            </CardHeader>
          </Card>
          <ProductImages product={product} />
          <DeleteCard product={product} />
        </aside>
      )}
    </div>
  );
}

// The rich-text content, with uploads and the picker in the product's folder
function ProductContent({ product }: { product: Product }) {
  const picker = useProductPicker(product.id);
  return (
    <>
      <RichTextEditor
        name="content"
        initialValue={product.content ?? ""}
        onUploadImage={(file) => uploadImage(product.id, file)}
        filePicker={picker.open}
      />
      {picker.element}
    </>
  );
}

// TinyMCE shows a failure and removes the image
async function uploadImage(productId: string, file: File): Promise<string> {
  const form = new FormData();
  form.set("file", file, file.name);
  form.set("productId", productId);
  const res = await uploadProductImage(form);
  if (!res.url) {
    throw new Error(res.message ?? "Upload failed");
  }
  return res.url;
}

// Picker scoped to the product's own folder in the media library
function useProductPicker(productId: string) {
  const resolveScope = useCallback(async () => {
    const { folderId, message } = await ensureProductFolder(productId);
    return folderId
      ? {
          folderId,
          label: "This product",
        }
      : {
          error: `Couldn't open this product's files: ${message ?? "unknown error"}`,
        };
  }, [
    productId,
  ]);
  return useMediaPicker({
    resolveScope,
  });
}

// Cover and gallery share one lightbox: click any image to see them all
// full size
function ProductImages({ product }: { product: Product }) {
  const lightbox = useLightbox(
    [
      product.cover?.url,
      ...product.gallery.map((g) => g.url),
    ].join("\n"),
  );
  return (
    <>
      <CoverCard product={product} lightbox={lightbox} />
      <GalleryCard product={product} lightbox={lightbox} />
    </>
  );
}

function CoverCard({
  product,
  lightbox,
}: {
  product: Product;
  lightbox: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const picker = useProductPicker(product.id);

  // The unsaved change: an existing asset (a link or a library pick), a
  // file uploaded on Save (`url` is a local preview), or removing the
  // cover; null = as saved
  const [change, setChange] = useState<NewImage | "remove" | null>(null);
  const previewOf = useObjectUrls();
  const set = (asset: { id: string; url: string }) => setChange(asset);
  const removing = change === "remove";
  const chosen = change && change !== "remove" ? change : null;
  const shown = chosen?.url ?? product.cover?.url ?? null;

  const save = () =>
    startTransition(async () => {
      let assetId: string | null = null;
      if (chosen) {
        const uploaded = await assetIdOf(product.id, chosen);
        if (!uploaded.id) {
          notify("Couldn't upload the image", {
            kind: "error",
            description: uploaded.message,
          });
          return;
        }
        assetId = uploaded.id;
      }
      const res = await setProductCover(product.id, assetId);
      notify(res.ok ? (res.message ?? "Saved") : "Couldn't change the cover", {
        kind: res.ok ? "success" : "error",
        description: res.ok ? undefined : res.message,
      });
      if (res.ok) {
        setChange(null);
        await router.invalidate();
      }
    });

  // Upload / Camera / Link / From library, like a gallery item; Save
  // applies it
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const drop = useFileDrop((file) => upload(file), IMAGE_TYPES, pending);
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
        set(file);
      }
    }
  };
  // Kept in the browser until Save
  const upload = (file: File) =>
    setChange({
      file,
      url: previewOf(file),
    });
  const addLink = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const url = String(new FormData(e.currentTarget).get("url") ?? "");
    startTransition(async () => {
      const res = await addProductPhotoLink(product.id, url);
      if (!res.asset) {
        setLinkError(res.message ?? "Couldn't add the link.");
        return;
      }
      setLinkOpen(false);
      set(res.asset);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cover image</CardTitle>
        <CardDescription>Shown in the shop and link previews.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="relative" {...drop.props}>
          {shown ? (
            <a
              href={shown}
              data-gallery={lightbox}
              aria-label="View the cover full size"
              className="block aspect-square w-full cursor-zoom-in overflow-hidden rounded-md border bg-muted"
            >
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
                disabled={pending}
                className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
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
                  disabled={pending}
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
                  disabled={pending}
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
                  disabled={pending}
                  // A new image is dropped; the saved cover is marked
                  onClick={() => setChange(chosen ? null : "remove")}
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
              <Button type="submit" size="sm" disabled={pending}>
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
          disabled={pending || !change}
          onClick={save}
          className="self-end"
        >
          {pending ? "Saving…" : "Save"}
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
        {picker.element}
      </CardContent>
    </Card>
  );
}

// A chosen image: an asset that exists (a link, a library pick) or a file
// that is uploaded on Save, shown meanwhile from a local preview URL
type NewImage =
  | {
      id: string;
      url: string;
    }
  | {
      file: File;
      url: string;
    };

// The asset id to save: uploads the file first when there is one
async function assetIdOf(
  productId: string,
  image: NewImage,
): Promise<{
  id?: string;
  message?: string;
}> {
  if ("id" in image) {
    return {
      id: image.id,
    };
  }
  const res = await uploadProductPhoto(productId, image.file);
  return res.asset
    ? {
        id: res.asset.id,
      }
    : {
        message: `${image.file.name}: ${res.message ?? "upload failed"}`,
      };
}

// One gallery item while editing: `key` stays for its whole life (drag and
// React keys), the image may still be missing on a new item
type GalleryDraftItem = {
  key: string;
  assetId: string | null;
  // A file chosen for it, uploaded on Save (`url` is its local preview)
  file?: File;
  url: string | null;
  title: string | null;
  description: string | null;
};

const toDraft = (gallery: GalleryItem[]): GalleryDraftItem[] =>
  gallery.map((g) => ({
    key: g.assetId,
    assetId: g.assetId,
    url: g.url,
    title: g.title,
    description: g.description,
  }));

// Images in order, each with an optional caption. Every change (add, image,
// caption, order, remove) stays on the card until "Save", which sends the
// whole list; items still without an image hold it back.
function GalleryCard({
  product,
  lightbox,
}: {
  product: Product;
  lightbox: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const picker = useProductPicker(product.id);
  // Unsaved changes; null = as saved
  const [draft, setDraft] = useState<GalleryDraftItem[] | null>(null);
  const items = draft ?? toDraft(product.gallery);
  const keys = items.map((g) => g.key);
  const missing = items.filter((g) => !g.assetId && !g.file).length;
  const previewOf = useObjectUrls();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const change = (key: string, patch: Partial<Omit<GalleryDraftItem, "key">>) =>
    setDraft(
      items.map((g) =>
        g.key === key
          ? {
              ...g,
              ...patch,
            }
          : g,
      ),
    );

  const save = () =>
    startTransition(async () => {
      // Chosen files first, in order; the first failure stops the save
      const saved: GalleryDraftItem[] = [];
      for (const item of items) {
        if (!item.file) {
          saved.push(item);
          continue;
        }
        const uploaded = await assetIdOf(product.id, {
          file: item.file,
          url: item.url ?? "",
        });
        if (!uploaded.id) {
          // What did upload stays uploaded, not chosen again
          setDraft([
            ...saved,
            ...items.slice(saved.length),
          ]);
          notify("Couldn't upload an image", {
            kind: "error",
            description: uploaded.message,
          });
          return;
        }
        saved.push({
          ...item,
          assetId: uploaded.id,
          file: undefined,
        });
      }
      const res = await setProductGallery(
        product.id,
        saved.flatMap(({ assetId, title, description }) =>
          assetId
            ? [
                {
                  assetId,
                  // Blank clears the caption
                  title: title?.trim() || null,
                  description: description?.trim() || null,
                },
              ]
            : [],
        ),
      );
      if (res.ok) {
        setDraft(null);
        await router.invalidate();
      } else {
        setDraft(saved);
        notify("Couldn't save the gallery", {
          kind: "error",
          description: res.message,
        });
      }
    });

  // Puts an image in an item; the same image twice is refused
  const setImage = (
    key: string,
    asset: {
      id: string;
      url: string;
    },
  ) => {
    if (items.some((g) => g.key !== key && g.assetId === asset.id)) {
      notify("That image is already in the gallery", {
        kind: "error",
      });
      return;
    }
    change(key, {
      assetId: asset.id,
      file: undefined,
      url: asset.url,
    });
  };

  // The item whose URL field is open
  const [linkFor, setLinkFor] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  // The item the file dialog is choosing for
  const uploadFor = useRef<string | null>(null);
  // The item the camera is open for
  const [cameraFor, setCameraFor] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const choose = async (key: string, source: ImageSource) => {
    setLinkError(null);
    if (source === "upload") {
      uploadFor.current = key;
      fileInput.current?.click();
    } else if (source === "camera") {
      setCameraFor(key);
    } else if (source === "link") {
      setLinkFor(key);
    } else {
      const file = await picker.open("image");
      if (file) {
        setImage(key, file);
      }
    }
  };
  // Kept in the browser until Save
  const upload = (key: string, file: File) =>
    change(key, {
      assetId: null,
      file,
      url: previewOf(file),
    });
  const addLink = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const key = linkFor;
    const url = String(new FormData(e.currentTarget).get("url") ?? "");
    if (!key) {
      return;
    }
    startTransition(async () => {
      const res = await addProductPhotoLink(product.id, url);
      if (!res.asset) {
        setLinkError(res.message ?? "Couldn't add the link.");
        return;
      }
      setLinkFor(null);
      setImage(key, res.asset);
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const from = keys.indexOf(String(active.id));
    const to = over ? keys.indexOf(String(over.id)) : -1;
    if (from < 0 || to < 0 || from === to) {
      return;
    }
    setDraft(arrayMove(items, from, to));
  };

  const count = items.length - missing;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gallery</CardTitle>
        <CardDescription>
          {count === 0
            ? "More images on the product page."
            : `${count} image${count > 1 ? "s" : ""}; first shows first.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={keys}
              strategy={verticalListSortingStrategy}
            >
              <ul className="flex flex-col gap-5">
                {items.map((item, i) => (
                  <GalleryRow
                    key={item.key}
                    item={item}
                    index={i}
                    lightbox={lightbox}
                    pending={pending}
                    linkOpen={linkFor === item.key}
                    linkError={linkFor === item.key ? linkError : null}
                    onChoose={(source) => choose(item.key, source)}
                    onDropFile={(file) => upload(item.key, file)}
                    onLink={addLink}
                    onLinkCancel={() => setLinkFor(null)}
                    onLinkInput={() => setLinkError(null)}
                    onRemove={() =>
                      setDraft(items.filter((g) => g.key !== item.key))
                    }
                    onCaption={(caption) => change(item.key, caption)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          className="self-start"
          onClick={() =>
            setDraft([
              ...items,
              {
                key: `new-${crypto.randomUUID()}`,
                assetId: null,
                url: null,
                title: null,
                description: null,
              },
            ])
          }
        >
          <Plus /> Add
        </Button>
        {/* For an item's Upload: one image into that item */}
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
            if (file && uploadFor.current) {
              upload(uploadFor.current, file);
            }
            uploadFor.current = null;
          }}
        />
        <div className="flex items-center justify-end gap-2">
          {missing > 0 && (
            <span className="mr-auto text-xs text-muted-foreground">
              Add an image to every item, or remove it.
            </span>
          )}
          {draft && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => {
                setDraft(null);
                setLinkFor(null);
              }}
            >
              Reset
            </Button>
          )}
          <Button
            size="sm"
            disabled={pending || !draft || missing > 0}
            onClick={save}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
        <CameraDialog
          open={cameraFor !== null}
          onClose={() => setCameraFor(null)}
          onCapture={(file) => {
            if (cameraFor) {
              upload(cameraFor, file);
            }
            setCameraFor(null);
          }}
        />
        {picker.element}
      </CardContent>
    </Card>
  );
}

// One gallery item: a drag handle, its image (or an empty slot to fill),
// replace and remove over it, then the caption inputs
function GalleryRow({
  item,
  index,
  lightbox,
  pending,
  linkOpen,
  linkError,
  onChoose,
  onDropFile,
  onLink,
  onLinkCancel,
  onLinkInput,
  onRemove,
  onCaption,
}: {
  item: GalleryDraftItem;
  index: number;
  lightbox: string;
  pending: boolean;
  linkOpen: boolean;
  linkError: string | null;
  onChoose: (source: ImageSource) => void;
  // An image file dropped on the slot
  onDropFile: (file: File) => void;
  onLink: (e: FormEvent<HTMLFormElement>) => void;
  onLinkCancel: () => void;
  onLinkInput: () => void;
  onRemove: () => void;
  onCaption: (
    caption: Partial<Pick<GalleryDraftItem, "title" | "description">>,
  ) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.key,
    disabled: pending,
  });
  const errorId = `gallery-link-error-${item.key}`;
  const drop = useFileDrop(onDropFile, IMAGE_TYPES, pending);
  return (
    <li
      ref={setNodeRef}
      style={{
        // Vertical only: sideways drift pushed the item out of the card,
        // which clips it
        transform: CSS.Translate.toString(
          transform && {
            ...transform,
            x: 0,
          },
        ),
        transition,
      }}
      className={cn(
        "-mx-1 flex gap-2 rounded-lg bg-card p-1",
        isDragging && "relative z-10 shadow-lg ring-1 ring-foreground/10",
      )}
    >
      <Button
        ref={setActivatorNodeRef}
        variant="ghost"
        size="icon-xs"
        aria-label={`Reorder item ${index + 1}`}
        className="cursor-grab touch-none self-center active:cursor-grabbing"
        disabled={pending}
        {...attributes}
        {...listeners}
      >
        <GripVertical />
      </Button>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="relative" {...drop.props}>
          {item.url ? (
            <a
              href={item.url}
              data-gallery={lightbox}
              data-title={item.title ?? undefined}
              data-description={item.description ?? undefined}
              aria-label={`View image ${index + 1} full size`}
              className="block aspect-video w-full cursor-zoom-in overflow-hidden rounded-md border bg-muted"
            >
              <img
                src={item.url}
                alt={item.title ?? ""}
                className="size-full object-cover"
              />
            </a>
          ) : (
            <ImageSourceMenu
              label="Add image"
              align="start"
              onChoose={onChoose}
            >
              <button
                type="button"
                disabled={pending}
                className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <ImageUp className="size-5" />
                Add image
                <span className="text-xs">or drop one here</span>
              </button>
            </ImageSourceMenu>
          )}
          {drop.over && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-background/70 text-sm font-medium ring-1 ring-primary">
              Drop to use this image
            </div>
          )}
          <div className="absolute -top-2 -right-2 flex gap-1">
            {item.url && (
              <ImageSourceMenu
                label="Replace with"
                align="end"
                onChoose={onChoose}
              >
                <Button
                  variant="secondary"
                  size="icon-xs"
                  aria-label={`Replace image ${index + 1}`}
                  title="Replace image"
                  className="rounded-full border shadow-sm"
                  disabled={pending}
                >
                  <RefreshCw />
                </Button>
              </ImageSourceMenu>
            )}
            <Button
              variant="secondary"
              size="icon-xs"
              aria-label={`Remove item ${index + 1} from the gallery`}
              title="Remove from gallery"
              disabled={pending}
              onClick={onRemove}
              className="rounded-full border shadow-sm"
            >
              <X />
            </Button>
          </div>
        </div>
        {linkOpen && (
          <form noValidate onSubmit={onLink} className="flex flex-col gap-1.5">
            <div className="flex flex-wrap justify-end gap-2">
              <Input
                className="basis-full"
                name="url"
                type="url"
                autoFocus
                placeholder="https://example.com/image.jpg"
                aria-label="Image URL"
                aria-invalid={!!linkError || undefined}
                aria-describedby={linkError ? errorId : undefined}
                onChange={onLinkInput}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onLinkCancel}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                Use
              </Button>
            </div>
            {linkError ? (
              <p id={errorId} className="text-sm text-destructive">
                {linkError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Shown from its own site; nothing is copied.
              </p>
            )}
          </form>
        )}
        <Input
          aria-label={`Item ${index + 1} title`}
          placeholder="Title"
          maxLength={255}
          value={item.title ?? ""}
          disabled={pending}
          onChange={(e) =>
            onCaption({
              title: e.target.value,
            })
          }
        />
        <Textarea
          aria-label={`Item ${index + 1} description`}
          placeholder="Description"
          maxLength={1000}
          rows={2}
          value={item.description ?? ""}
          disabled={pending}
          onChange={(e) =>
            onCaption({
              description: e.target.value,
            })
          }
        />
      </div>
    </li>
  );
}

function DeleteCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  const [pending, startTransition] = useTransition();
  return (
    <Card>
      <CardContent className="flex justify-end">
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Delete “${product.name}”?`)) {
              return;
            }
            startTransition(async () => {
              const res = await deleteProduct(product.id);
              if (res.ok) {
                notify("Product deleted", {
                  kind: "success",
                  description: product.name,
                });
                await navigate({
                  to: "/admin/products",
                });
              } else {
                notify("Couldn't delete product", {
                  kind: "error",
                  description: res.message,
                });
              }
            });
          }}
        >
          Delete product
        </Button>
      </CardContent>
    </Card>
  );
}

// A datetime-local input in the browser's time zone, sent as ISO in a hidden
// input so the api never guesses the zone
function SaleTime({
  name,
  label,
  value,
  hint,
  error,
}: {
  name: string;
  label: string;
  value: string | null;
  hint: string;
  error?: string;
}) {
  const [local, setLocal] = useState(() => (value ? toLocalInput(value) : ""));
  const iso = local ? new Date(local).toISOString() : "";
  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        type="datetime-local"
        aria-invalid={!!error || undefined}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
      />
      <input type="hidden" name={name} value={iso} />
      <FieldDescription>{hint}</FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  );
}

// "2026-11-01T14:30" in the browser's zone
function toLocalInput(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
