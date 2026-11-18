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
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import type { LayoutFields, PageLayout } from "@/lib/types";
import {
  createLayout,
  deleteLayout,
  makeDefaultLayout,
  type PageState,
  saveLayout,
} from "./actions";
import { type BlockChoices, BlockEditor } from "./block-editor";
import { LAYOUT_CHOICES, TEMPLATE_LABELS } from "./layout-fields";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm";

type Simple = keyof typeof LAYOUT_CHOICES;

// A blank layout for /panel/pages/layouts/new: no id until the first save
export const NEW_LAYOUT: PageLayout = {
  id: "",
  name: "",
  isDefault: false,
  settings: {},
  pageCount: 0,
  updatedAt: "",
};

// Edits a layout, or starts a new one (layout.id empty): saving creates it.
// The sidebar's blocks, making it the default and delete come after that.
export function LayoutEditor({
  layout,
  choices,
}: {
  layout: PageLayout;
  choices: BlockChoices;
}) {
  const isNew = !layout.id;
  const [name, setName] = useState(layout.name);
  const [settings, setSettings] = useState(layout.settings);
  const [result, setResult] = useState<PageState>({});
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

  const template = settings.template ?? "default";
  // Kept when switching away, so switching back restores it; only sent
  // with the sidebar template (the api refuses it otherwise)
  const sidebar = settings.sidebar ?? {
    side: "right" as const,
    sticky: false,
    blocks: [],
  };
  const setSidebar = (changes: Partial<NonNullable<LayoutFields["sidebar"]>>) =>
    setSettings({
      ...settings,
      sidebar: {
        ...sidebar,
        ...changes,
      },
    });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        {result.message && (
          <Alert variant={result.ok ? "default" : "destructive"}>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}
        <Field data-invalid={!!result.fieldErrors?.name || undefined}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            value={name}
            maxLength={100}
            autoFocus={isNew}
            placeholder="Untitled layout"
            aria-invalid={!!result.fieldErrors?.name || undefined}
            onChange={(e) => setName(e.target.value)}
          />
          <FieldError>{result.fieldErrors?.name}</FieldError>
        </Field>
        <Card>
          <CardHeader>
            <CardTitle>Template</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(TEMPLATE_LABELS) as LayoutFields["template"][]).map(
              (t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      template: t,
                    })
                  }
                  className={`rounded-lg border p-3 text-left text-sm ${template === t ? "border-primary ring-1 ring-primary" : ""}`}
                >
                  <TemplateThumb template={t} />
                  <span className="mt-2 block">{TEMPLATE_LABELS[t]}</span>
                </button>
              ),
            )}
          </CardContent>
        </Card>
        {template === "sidebar" && (
          <Card>
            <CardHeader>
              <CardTitle>Sidebar</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  Side
                  <select
                    className={`${selectClass} w-28`}
                    value={sidebar.side}
                    onChange={(e) =>
                      setSidebar({
                        side: e.target.value as "left" | "right",
                      })
                    }
                  >
                    <option value="right">Right</option>
                    <option value="left">Left</option>
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sidebar.sticky}
                    onChange={(e) =>
                      setSidebar({
                        sticky: e.target.checked,
                      })
                    }
                  />
                  Stays in view while scrolling
                </label>
              </div>
              {/* The sidebar's content comes after the first save */}
              {isNew ? (
                <p className="text-sm text-muted-foreground">
                  Add the sidebar&apos;s blocks after creating the layout.
                </p>
              ) : (
                <BlockEditor
                  blocks={sidebar.blocks}
                  place="sidebar"
                  choices={choices}
                  onChange={(blocks) =>
                    setSidebar({
                      blocks,
                    })
                  }
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isNew && <Badge variant="secondary">not saved</Badge>}
              {layout.isDefault && <Badge>default</Badge>}
              {!isNew && (
                <span className="text-sm font-normal text-muted-foreground">
                  Used by {layout.pageCount} page
                  {layout.pageCount === 1 ? "" : "s"}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button
              disabled={pending}
              onClick={() =>
                run(async () => {
                  // A new layout without a name is "Untitled layout"
                  if (!isNew && !name.trim()) {
                    return {
                      fieldErrors: {
                        name: "Enter a name.",
                      },
                    };
                  }
                  if (name.trim().length > 100) {
                    return {
                      fieldErrors: {
                        name: "Use at most 100 characters.",
                      },
                    };
                  }
                  const { sidebar: sb, ...rest } = settings;
                  const changes = {
                    name,
                    settings:
                      template === "sidebar"
                        ? {
                            ...rest,
                            sidebar: sb ?? sidebar,
                          }
                        : rest,
                  };
                  if (!isNew) {
                    return saveLayout(layout.id, changes);
                  }
                  const created = await createLayout(changes);
                  if (created.id) {
                    await navigate({
                      to: "/admin/pages/layouts/$id",
                      params: {
                        id: created.id,
                      },
                    });
                    return {};
                  }
                  return created;
                })
              }
            >
              {pending ? "Saving…" : isNew ? "Create layout" : "Save"}
            </Button>
            {!isNew && !layout.isDefault && (
              <>
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => run(() => makeDefaultLayout(layout.id))}
                >
                  Make default
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`Delete "${layout.name}"?`)) {
                      startTransition(async () => {
                        const res = await deleteLayout(layout.id);
                        if (res.ok) {
                          await navigate({
                            to: "/admin/pages/layouts",
                          });
                        } else {
                          setResult(res);
                        }
                      });
                    }
                  }}
                >
                  Delete layout
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Frame</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {(Object.keys(LAYOUT_CHOICES) as Simple[]).map((f) => (
                <Field key={f}>
                  <FieldLabel htmlFor={`l-${f}`}>
                    {LAYOUT_CHOICES[f].label}
                  </FieldLabel>
                  <select
                    id={`l-${f}`}
                    className={selectClass}
                    value={settings[f] ?? LAYOUT_CHOICES[f].values[0]}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        [f]: e.target.value,
                      })
                    }
                  >
                    {LAYOUT_CHOICES[f].values.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
              <FieldDescription>
                Pages using this layout may override these; the template and
                sidebar are shared.
              </FieldDescription>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// A tiny wireframe of the template
function TemplateThumb({ template }: { template: LayoutFields["template"] }) {
  const bar = "rounded-sm bg-muted-foreground/30";
  return (
    <div className="flex h-16 flex-col gap-1 rounded-md border bg-muted/40 p-1.5">
      {template !== "blank" && <div className={`h-1.5 ${bar}`} />}
      <div className="flex flex-1 gap-1">
        <div
          className={`flex flex-1 flex-col gap-1 ${template === "landing" || template === "blank" ? "" : "mx-3"}`}
        >
          {template === "landing" ? (
            <div className={`h-5 ${bar}`} />
          ) : (
            <div className={`h-1.5 w-1/2 ${bar}`} />
          )}
          <div className={`h-1.5 ${bar}`} />
          <div className={`h-1.5 w-3/4 ${bar}`} />
        </div>
        {template === "sidebar" && <div className={`w-4 ${bar}`} />}
      </div>
      {template !== "blank" && <div className={`h-1 ${bar}`} />}
    </div>
  );
}
