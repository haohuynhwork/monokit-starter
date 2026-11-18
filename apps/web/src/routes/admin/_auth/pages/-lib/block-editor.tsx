import { Button } from "@packages/ui/components/button";
import { Field, FieldLabel } from "@packages/ui/components/field";
import { Input } from "@packages/ui/components/input";
import { Textarea } from "@packages/ui/components/textarea";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ImageIcon,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useMediaPicker } from "@/components/media-picker";
import { RichTextEditor } from "@/components/rich-text-editor";
import type { Block, BlockType, Category, PostTag } from "@/lib/types";

// Edits a list of blocks (ideas/pages "Blocks") in memory; the page or
// layout editor saves it. The api checks every prop again.

export const BLOCK_LABELS: Record<BlockType, string> = {
  richText: "Rich text",
  hero: "Hero",
  image: "Image",
  gallery: "Gallery",
  productGrid: "Product grid",
  postList: "Latest posts",
  contactForm: "Contact form",
  faq: "FAQ",
  columns: "Columns",
};

// What data blocks pick from
export type BlockChoices = {
  categories: Category[];
  tags: PostTag[];
};

// Where a list sits; mirrors the api's notIn rules
export type BlockPlace = "main" | "column" | "sidebar";
const NOT_IN: Partial<Record<BlockType, BlockPlace[]>> = {
  hero: [
    "sidebar",
    "column",
  ],
  columns: [
    "sidebar",
    "column",
  ],
  contactForm: [
    "sidebar",
  ],
};

const newId = () => Math.random().toString(36).slice(2, 10);

function emptyBlock(type: BlockType): Block {
  const props: Record<BlockType, Record<string, unknown>> = {
    richText: {
      html: "",
    },
    hero: {
      title: "Headline",
    },
    image: {
      assetKey: "",
      alt: "",
    },
    gallery: {
      assetKeys: [],
    },
    productGrid: {
      limit: 8,
      sort: "newest",
    },
    postList: {
      limit: 5,
    },
    contactForm: {
      fields: [
        "name",
        "email",
        "subject",
        "message",
      ],
    },
    faq: {
      items: [
        {
          question: "",
          answer: "",
        },
      ],
    },
    columns: {
      columns: [
        {
          blocks: [],
        },
        {
          blocks: [],
        },
      ],
    },
  };
  return {
    id: newId(),
    type,
    props: props[type],
  };
}

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm";

export function BlockEditor({
  blocks,
  onChange,
  place,
  choices,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  place: BlockPlace;
  choices: BlockChoices;
}) {
  const picker = useMediaPicker();
  const [adding, setAdding] = useState<BlockType>("richText");
  const types = (Object.keys(BLOCK_LABELS) as BlockType[]).filter(
    (t) => !NOT_IN[t]?.includes(place),
  );

  const update = (i: number, block: Block) =>
    onChange(blocks.map((b, j) => (j === i ? block : b)));
  const move = (i: number, by: number) => {
    const next = [
      ...blocks,
    ];
    const [b] = next.splice(i, 1);
    if (b) {
      next.splice(i + by, 0, b);
    }
    onChange(next);
  };
  const pickImage = async () => {
    const file = await picker.open("image");
    // Blocks store the key
    return file?.key ?? null;
  };

  return (
    <div className="flex flex-col gap-3">
      {blocks.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No blocks yet.
        </p>
      )}
      {blocks.map((block, i) => (
        <div key={block.id} className="rounded-lg border bg-card">
          <div className="flex items-center gap-1 border-b bg-muted/40 px-3 py-1.5">
            <span className="text-sm font-medium">
              {BLOCK_LABELS[block.type]}
            </span>
            <span className="ml-1 font-mono text-xs text-muted-foreground">
              #{block.id}
            </span>
            <div className="ml-auto flex">
              <IconButton
                label="Move up"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ArrowUp />
              </IconButton>
              <IconButton
                label="Move down"
                disabled={i === blocks.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown />
              </IconButton>
              <IconButton
                label="Duplicate"
                onClick={() => {
                  const next = [
                    ...blocks,
                  ];
                  next.splice(i + 1, 0, {
                    ...structuredClone(block),
                    id: newId(),
                  });
                  onChange(next);
                }}
              >
                <Copy />
              </IconButton>
              <IconButton
                label="Delete"
                onClick={() => onChange(blocks.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </IconButton>
            </div>
          </div>
          <div className="p-3">
            <BlockForm
              block={block}
              onChange={(b) => update(i, b)}
              pickImage={pickImage}
              choices={choices}
            />
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <select
          aria-label="Block type"
          value={adding}
          onChange={(e) => setAdding(e.target.value as BlockType)}
          className={`${selectClass} w-48`}
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {BLOCK_LABELS[t]}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...blocks,
              emptyBlock(adding),
            ])
          }
        >
          <Plus /> Add block
        </Button>
      </div>
      {picker.element}
    </div>
  );
}

function IconButton({
  label,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </Button>
  );
}

function BlockForm({
  block,
  onChange,
  pickImage,
  choices,
}: {
  block: Block;
  onChange: (block: Block) => void;
  pickImage: () => Promise<string | null>;
  choices: BlockChoices;
}) {
  const p = block.props;
  const set = (changes: Record<string, unknown>) =>
    onChange({
      ...block,
      props: {
        ...p,
        ...changes,
      },
    });
  const text = (name: string, label: string, multiline = false) => (
    <Field>
      <FieldLabel htmlFor={`${block.id}-${name}`}>{label}</FieldLabel>
      {multiline ? (
        <Textarea
          id={`${block.id}-${name}`}
          value={String(p[name] ?? "")}
          onChange={(e) =>
            set({
              [name]: e.target.value,
            })
          }
        />
      ) : (
        <Input
          id={`${block.id}-${name}`}
          value={String(p[name] ?? "")}
          onChange={(e) =>
            set({
              [name]: e.target.value || undefined,
            })
          }
        />
      )}
    </Field>
  );
  const image = (name: string, label: string) => (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2">
        <Input
          value={String(p[name] ?? "")}
          placeholder="Pick a public image"
          readOnly
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            const key = await pickImage();
            if (key) {
              set({
                [name]: key,
              });
            }
          }}
        >
          <ImageIcon /> Pick
        </Button>
        {p[name] !== undefined && block.type !== "image" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              set({
                [name]: undefined,
              })
            }
          >
            Clear
          </Button>
        )}
      </div>
    </Field>
  );
  const number = (name: string, label: string, max: number) => (
    <Field>
      <FieldLabel htmlFor={`${block.id}-${name}`}>{label}</FieldLabel>
      <Input
        id={`${block.id}-${name}`}
        type="number"
        value={Number(p[name] ?? 1)}
        onChange={(e) =>
          set({
            // Kept within 1..max (no min/max attributes; the api checks too)
            [name]: Math.min(max, Math.max(1, Number(e.target.value) || 1)),
          })
        }
      />
    </Field>
  );

  switch (block.type) {
    case "richText":
      return (
        <RichTextEditor
          name={`block-${block.id}`}
          initialValue={String(p.html ?? "")}
          height={280}
          onChange={(html) =>
            set({
              html,
            })
          }
        />
      );
    case "hero": {
      const cta = p.cta as
        | {
            label: string;
            href: string;
          }
        | undefined;
      const setCta = (changes: Partial<NonNullable<typeof cta>>) => {
        const next = {
          label: "",
          href: "",
          ...cta,
          ...changes,
        };
        set({
          cta: next.label || next.href ? next : undefined,
        });
      };
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {text("title", "Title")}
          {text("subtitle", "Subtitle")}
          {image("imageKey", "Background image")}
          <div className="grid grid-cols-2 gap-2">
            <Field>
              <FieldLabel htmlFor={`${block.id}-cta-label`}>
                Button text
              </FieldLabel>
              <Input
                id={`${block.id}-cta-label`}
                value={cta?.label ?? ""}
                onChange={(e) =>
                  setCta({
                    label: e.target.value,
                  })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${block.id}-cta-href`}>
                Button link
              </FieldLabel>
              <Input
                id={`${block.id}-cta-href`}
                value={cta?.href ?? ""}
                placeholder="/shop/products"
                onChange={(e) =>
                  setCta({
                    href: e.target.value,
                  })
                }
              />
            </Field>
          </div>
        </div>
      );
    }
    case "image":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {image("assetKey", "Image")}
          {text("alt", "Alt text")}
          {text("caption", "Caption")}
        </div>
      );
    case "gallery": {
      const keys = (p.assetKeys as string[]) ?? [];
      return (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-col gap-1 text-sm">
            {keys.map((k, i) => (
              <li key={k} className="flex items-center gap-2">
                <span className="truncate font-mono text-xs">{k}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    set({
                      assetKeys: keys.filter((_, j) => j !== i),
                    })
                  }
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={async () => {
              const key = await pickImage();
              if (key && !keys.includes(key)) {
                set({
                  assetKeys: [
                    ...keys,
                    key,
                  ],
                });
              }
            }}
          >
            <Plus /> Add image
          </Button>
        </div>
      );
    }
    case "productGrid":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor={`${block.id}-cat`}>
              Product category
            </FieldLabel>
            <select
              id={`${block.id}-cat`}
              className={selectClass}
              value={String(p.productCategoryId ?? "")}
              onChange={(e) =>
                set({
                  productCategoryId: e.target.value || undefined,
                })
              }
            >
              <option value="">All products</option>
              {choices.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          {number("limit", "How many", 48)}
          <Field>
            <FieldLabel htmlFor={`${block.id}-sort`}>Sort</FieldLabel>
            <select
              id={`${block.id}-sort`}
              className={selectClass}
              value={String(p.sort ?? "newest")}
              onChange={(e) =>
                set({
                  sort: e.target.value,
                })
              }
            >
              <option value="newest">Newest</option>
              <option value="priceAsc">Price, low to high</option>
              <option value="priceDesc">Price, high to low</option>
            </select>
          </Field>
        </div>
      );
    case "postList":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${block.id}-tag`}>Tag</FieldLabel>
            <select
              id={`${block.id}-tag`}
              className={selectClass}
              value={String(p.tagId ?? "")}
              onChange={(e) =>
                set({
                  tagId: e.target.value || undefined,
                })
              }
            >
              <option value="">All posts</option>
              {choices.tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          {number("limit", "How many", 24)}
        </div>
      );
    case "contactForm": {
      const fields = (p.fields as string[]) ?? [];
      return (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {text("title", "Title")}
            {text("to", "Send to (empty: the site's sender address)")}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {[
              "name",
              "email",
              "phone",
              "subject",
              "message",
            ].map((f) => (
              <label key={f} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fields.includes(f)}
                  onChange={(e) =>
                    set({
                      fields: e.target.checked
                        ? [
                            ...fields,
                            f,
                          ]
                        : fields.filter((x) => x !== f),
                    })
                  }
                />
                {f}
              </label>
            ))}
          </div>
        </div>
      );
    }
    case "faq": {
      const items =
        (p.items as {
          question: string;
          answer: string;
        }[]) ?? [];
      const setItem = (i: number, changes: Partial<(typeof items)[number]>) =>
        set({
          items: items.map((it, j) =>
            j === i
              ? {
                  ...it,
                  ...changes,
                }
              : it,
          ),
        });
      return (
        <div className="flex flex-col gap-3">
          {items.map((it, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: items have no ids
            <div key={i} className="flex flex-col gap-2 rounded-md border p-2">
              <Input
                aria-label="Question"
                placeholder="Question"
                value={it.question}
                onChange={(e) =>
                  setItem(i, {
                    question: e.target.value,
                  })
                }
              />
              <Textarea
                aria-label="Answer"
                placeholder="Answer"
                value={it.answer}
                onChange={(e) =>
                  setItem(i, {
                    answer: e.target.value,
                  })
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-end"
                onClick={() =>
                  set({
                    items: items.filter((_, j) => j !== i),
                  })
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() =>
              set({
                items: [
                  ...items,
                  {
                    question: "",
                    answer: "",
                  },
                ],
              })
            }
          >
            <Plus /> Add question
          </Button>
        </div>
      );
    }
    case "columns": {
      const columns =
        (p.columns as {
          blocks: Block[];
        }[]) ?? [];
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm">
            Columns:
            {[
              2,
              3,
              4,
            ].map((n) => (
              <Button
                key={n}
                type="button"
                size="sm"
                variant={columns.length === n ? "default" : "outline"}
                onClick={() =>
                  set({
                    columns: Array.from(
                      {
                        length: n,
                      },
                      (_, i) =>
                        columns[i] ?? {
                          blocks: [],
                        },
                    ),
                  })
                }
              >
                {n}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {columns.map((c, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: columns have no ids
              <div key={i} className="rounded-md border border-dashed p-2">
                <p className="mb-2 text-xs text-muted-foreground">
                  Column {i + 1}
                </p>
                <BlockEditor
                  blocks={c.blocks}
                  place="column"
                  choices={choices}
                  onChange={(blocks) =>
                    set({
                      columns: columns.map((col, j) =>
                        j === i
                          ? {
                              blocks,
                            }
                          : col,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
