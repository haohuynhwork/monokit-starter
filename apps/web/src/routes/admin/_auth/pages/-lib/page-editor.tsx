import { Alert, AlertDescription } from "@packages/ui/components/alert";
import { Badge } from "@packages/ui/components/badge";
import { Button } from "@packages/ui/components/button";
import {
  Card,
  CardContent,
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
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useState, useTransition } from "react";
import type {
  LayoutOverrides,
  Page,
  PageLayout,
  PageSummary,
} from "@/lib/types";
import {
  createPage,
  deletePage,
  type PageState,
  publishPage,
  savePage,
  unpublishPage,
} from "./actions";
import { type BlockChoices, BlockEditor } from "./block-editor";
import { LAYOUT_CHOICES, TEMPLATE_LABELS } from "./layout-fields";

// The public site's origin (empty: same origin as the panel)
const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "").replace(/\/+$/, "");

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm";

// Fields a page may override (template and sidebar come from its layout)
const OVERRIDES = [
  "width",
  "header",
  "footer",
  "background",
  "spacing",
] as const;

// A blank page for /panel/pages/new: no id until the first save creates it
export const NEW_PAGE: Page = {
  id: "",
  parentId: null,
  layoutId: null,
  title: "",
  slug: null,
  path: null,
  status: "draft",
  publishedAt: null,
  live: false,
  showInMenu: false,
  menuOrder: 0,
  updatedAt: "",
  description: null,
  settings: {
    blocks: [],
  },
  createdAt: "",
};

// Edits a page, or starts a new one (page.id empty): saving creates it.
// The blocks, publishing and delete need the page, so a new one gets them
// after its first save.
export function PageEditor({
  page,
  pages,
  layouts,
  choices,
  error,
}: {
  page: Page;
  pages: PageSummary[];
  layouts: PageLayout[];
  choices: BlockChoices;
  // From creating: the page was made but the rest didn't save
  error?: string;
}) {
  const isNew = !page.id;
  const s = page.settings;
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug ?? "");
  const [description, setDescription] = useState(page.description ?? "");
  const [parentId, setParentId] = useState(page.parentId ?? "");
  const [layoutId, setLayoutId] = useState(page.layoutId ?? "");
  const [showInMenu, setShowInMenu] = useState(page.showInMenu);
  const [menuOrder, setMenuOrder] = useState(page.menuOrder);
  const [overrides, setOverrides] = useState<LayoutOverrides>(s.layout ?? {});
  const [showTitle, setShowTitle] = useState(s.showTitle ?? true);
  const [seoTitle, setSeoTitle] = useState(s["seo.title"] ?? "");
  const [noindex, setNoindex] = useState(s["seo.noindex"] ?? false);
  const [blocks, setBlocks] = useState(s.blocks ?? []);
  const [result, setResult] = useState<PageState>(
    error
      ? {
          message: `Created, but not everything was saved: ${error}`,
        }
      : {},
  );
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const navigate = useNavigate();
  // A success reloads the route (fresh editor, see the route's key)
  const run = (action: () => Promise<PageState>) =>
    startTransition(async () => {
      const res = await action();
      setResult(res);
      if (res.ok) {
        await router.invalidate();
      }
    });
  const fieldError = (name: string) => result.fieldErrors?.[name];
  const invalid = (name: string) => !!fieldError(name) || undefined;
  // Checked before any request, so a new page isn't created half-saved
  const check = (): PageState | null => {
    const e: Record<string, string> = {};
    const t = title.trim().length;
    if (t === 0) {
      e.title = "Enter a title.";
    } else if (t > 255) {
      e.title = "Use at most 255 characters.";
    }
    if (slug.trim().length > 255) {
      e.slug = "Use at most 255 characters.";
    } else if (/[?#]/.test(slug)) {
      e.slug = "Don't use ? or #.";
    }
    if (description.trim().length > 500) {
      e.description = "Use at most 500 characters.";
    }
    if (!Number.isInteger(menuOrder)) {
      e.menuOrder = "Enter a whole number.";
    }
    if (seoTitle.trim().length > 70) {
      e.seoTitle = "Use at most 70 characters.";
    }
    return Object.keys(e).length
      ? {
          fieldErrors: e,
        }
      : null;
  };

  const layout =
    layouts.find((l) => l.id === layoutId) ?? layouts.find((l) => l.isDefault);
  const template = layout?.settings.template ?? "default";

  const changes = () => ({
    title,
    slug: slug.trim() || null,
    description: description.trim() || null,
    layoutId: layoutId || null,
    showInMenu,
    menuOrder,
    settings: {
      // Keeps options this form doesn't edit (e.g. seo.imageKey)
      ...s,
      version: 1,
      layout: overrides,
      showTitle,
      "seo.title": seoTitle.trim() || null,
      "seo.noindex": noindex,
      blocks,
    },
  });
  const save = async (): Promise<PageState> => {
    const checked = check();
    if (checked) {
      return checked;
    }
    if (!isNew) {
      return savePage(page.id, changes(), {
        from: page.parentId,
        to: parentId || null,
      });
    }
    const created = await createPage(changes(), parentId || null);
    if (!created.id) {
      return created;
    }
    // The page exists either way; a failed save shows in its editor
    await navigate({
      to: "/admin/pages/$id",
      params: {
        id: created.id,
      },
      search: {
        error: created.error || undefined,
      },
    });
    return {};
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        {result.message && (
          <Alert variant={result.ok ? "default" : "destructive"}>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}
        <Field data-invalid={invalid("title")}>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            value={title}
            autoFocus={isNew}
            placeholder="Untitled"
            aria-invalid={invalid("title")}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg"
          />
          <FieldError>{fieldError("title")}</FieldError>
        </Field>
        {/* The content comes after the first save */}
        {!isNew && (
          <Card>
            <CardHeader>
              <CardTitle>Blocks</CardTitle>
            </CardHeader>
            <CardContent>
              <BlockEditor
                blocks={blocks}
                onChange={setBlocks}
                place="main"
                choices={choices}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Status
              <Badge variant={page.live ? "default" : "secondary"}>
                {isNew ? "not saved" : page.live ? "live" : page.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button disabled={pending} onClick={() => run(save)}>
              {pending ? "Saving…" : isNew ? "Create page" : "Save"}
            </Button>
            {isNew ? (
              <p className="text-sm text-muted-foreground">
                Nothing is created until you save. Then you add the blocks and
                publish it.
              </p>
            ) : (
              <>
                {page.status === "draft" ? (
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        const saved = await save();
                        return saved.ok ? publishPage(page.id) : saved;
                      })
                    }
                  >
                    Save and publish
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => run(() => unpublishPage(page.id))}
                  >
                    Unpublish
                  </Button>
                )}
                {page.live && page.path && (
                  <Button variant="ghost" size="sm" asChild>
                    {/* The public site, not a panel route */}
                    <a
                      href={`${SITE_URL}/${page.path}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View <ExternalLink />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`Delete "${page.title}"?`)) {
                      startTransition(async () => {
                        const res = await deletePage(page.id);
                        if (res.ok) {
                          await navigate({
                            to: "/admin/pages",
                          });
                        } else {
                          setResult(res);
                        }
                      });
                    }
                  }}
                >
                  Delete page
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Page</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={invalid("slug")}>
                <FieldLabel htmlFor="slug">Slug</FieldLabel>
                <Input
                  id="slug"
                  value={slug}
                  placeholder="e.g. about"
                  aria-invalid={invalid("slug")}
                  onChange={(e) => setSlug(e.target.value)}
                />
                <FieldError>{fieldError("slug")}</FieldError>
                <FieldDescription>
                  {page.path
                    ? `URL: /${page.path}`
                    : "No URL yet. Needed to publish."}
                </FieldDescription>
              </Field>
              <Field data-invalid={invalid("parentId")}>
                <FieldLabel htmlFor="parentId">Parent page</FieldLabel>
                <select
                  id="parentId"
                  className={selectClass}
                  aria-invalid={invalid("parentId")}
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                >
                  <option value="">None (top level)</option>
                  {pages
                    .filter((p) => p.id !== page.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.path ? `/${p.path}` : `${p.title} (no URL)`}
                      </option>
                    ))}
                </select>
                <FieldError>{fieldError("parentId")}</FieldError>
              </Field>
              <Field data-invalid={invalid("description")}>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea
                  id="description"
                  value={description}
                  maxLength={500}
                  aria-invalid={invalid("description")}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <FieldError>{fieldError("description")}</FieldError>
                <FieldDescription>
                  For search results and link previews.
                </FieldDescription>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showInMenu}
                  onChange={(e) => setShowInMenu(e.target.checked)}
                />
                Show in the site menu
              </label>
              <Field data-invalid={invalid("menuOrder")}>
                <FieldLabel htmlFor="menuOrder">Menu order</FieldLabel>
                <Input
                  id="menuOrder"
                  type="number"
                  value={menuOrder}
                  aria-invalid={invalid("menuOrder")}
                  onChange={(e) => setMenuOrder(Number(e.target.value))}
                />
                <FieldError>{fieldError("menuOrder")}</FieldError>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Layout</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="layoutId">Layout</FieldLabel>
                <select
                  id="layoutId"
                  className={selectClass}
                  value={layoutId}
                  onChange={(e) => setLayoutId(e.target.value)}
                >
                  <option value="">
                    Default ({layouts.find((l) => l.isDefault)?.name ?? "none"})
                  </option>
                  {layouts.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ·{" "}
                      {TEMPLATE_LABELS[l.settings.template ?? "default"]}
                    </option>
                  ))}
                </select>
                <FieldDescription>
                  Template: {TEMPLATE_LABELS[template]}.{" "}
                  <Link to="/admin/pages/layouts" className="underline">
                    Manage layouts
                  </Link>
                </FieldDescription>
              </Field>
              {OVERRIDES.map((f) => (
                <Field key={f}>
                  <FieldLabel htmlFor={`o-${f}`}>
                    {LAYOUT_CHOICES[f].label}
                  </FieldLabel>
                  <select
                    id={`o-${f}`}
                    className={selectClass}
                    value={overrides[f] ?? ""}
                    onChange={(e) =>
                      setOverrides({
                        ...overrides,
                        [f]: e.target.value || undefined,
                      })
                    }
                  >
                    <option value="">
                      From layout (
                      {layout?.settings[f] ?? LAYOUT_CHOICES[f].values[0]})
                    </option>
                    {LAYOUT_CHOICES[f].values.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showTitle}
                  onChange={(e) => setShowTitle(e.target.checked)}
                />
                Show the title (turn off when a hero shows it)
              </label>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search engines</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={invalid("seoTitle")}>
                <FieldLabel htmlFor="seoTitle">Browser title</FieldLabel>
                <Input
                  id="seoTitle"
                  value={seoTitle}
                  maxLength={70}
                  placeholder={title}
                  aria-invalid={invalid("seoTitle")}
                  onChange={(e) => setSeoTitle(e.target.value)}
                />
                <FieldError>{fieldError("seoTitle")}</FieldError>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={noindex}
                  onChange={(e) => setNoindex(e.target.checked)}
                />
                Hide from search engines
              </label>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
