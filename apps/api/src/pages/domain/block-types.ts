import {
  type Check,
  type CheckResult,
  int,
  isRecord,
  no,
  ok,
  oneOf,
  text,
} from "../../common/domain/checks.js";
import { inlineAssetKeys } from "../../common/domain/html.js";
import { InvalidContactMessageError, InvalidPageError } from "./page.errors.js";

// Known block types (ideas/pages "Blocks"). A block is { id, type, props };
// props are settings only (ids, limits, text), never copies of products or
// posts. A new type is a check here, a form in the panel and a component in
// the site's block renderer.

export interface Block {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
}

export const MAX_PAGE_BLOCKS = 100;
export const MAX_SIDEBAR_BLOCKS = 30;

// Where a block list sits: page body, inside `columns`, or a layout sidebar
export type BlockPlace = "main" | "column" | "sidebar";

const optional =
  <T>(check: Check<T>): Check<T | undefined> =>
  (v) =>
    v === undefined ? ok(undefined) : check(v);

const required =
  (max: number): Check<string> =>
  (v) => {
    const r = text(max)(v);
    return r.ok && r.value === "" ? no("is required") : r;
  };

// Public key of a file in the media library (Asset.key; shown at serve/<key>)
const assetKey: Check<string> = (v) =>
  typeof v === "string" && /^[^\s?#]{1,512}$/.test(v)
    ? ok(v)
    : no("must be a file from the media library");

// A site path ('/about') or an https link
const href: Check<string> = (v) =>
  typeof v === "string" &&
  v.length <= 2048 &&
  (/^\/(?!\/)/.test(v) || v.startsWith("https://") || v.startsWith("mailto:"))
    ? ok(v)
    : no("must start with /, https:// or mailto:");

const id: Check<string> = (v) =>
  typeof v === "string" && /^[1-9]\d{0,18}$/.test(v)
    ? ok(v)
    : no("must be an id");

const list =
  <T>(check: Check<T>, min: number, max: number): Check<T[]> =>
  (v) => {
    if (!Array.isArray(v)) {
      return no("must be a list");
    }
    if (v.length < min || v.length > max) {
      return no(`must have ${min} to ${max} items`);
    }
    const out: T[] = [];
    for (const [i, item] of v.entries()) {
      const r = check(item);
      if (!r.ok) {
        return no(`item ${i + 1} ${r.reason}`);
      }
      out.push(r.value);
    }
    return ok(out);
  };

// Runs each field's check and keeps only known fields; undefined drops out
function shape(
  checks: Record<string, Check<unknown>>,
): Check<Record<string, unknown>> {
  return (v) => {
    if (!isRecord(v)) {
      return no("must be an object");
    }
    const out: Record<string, unknown> = {};
    for (const [name, check] of Object.entries(checks)) {
      const r = check(v[name]);
      if (!r.ok) {
        return no(`${name} ${r.reason}`);
      }
      if (r.value !== undefined) {
        out[name] = r.value;
      }
    }
    return ok(out);
  };
}

const CONTACT_FIELDS = [
  "name",
  "email",
  "phone",
  "subject",
  "message",
] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const email: Check<string> = (v) =>
  typeof v === "string" && v.length <= 255 && EMAIL.test(v.trim())
    ? ok(v.trim())
    : no("must be an email address");

interface TypeSpec {
  props: Check<Record<string, unknown>>;
  // Not allowed in these places
  notIn?: BlockPlace[];
  // Extra rule for a layout sidebar
  sidebar?: (props: Record<string, unknown>) => string | null;
}

export const BLOCK_TYPES = {
  // `html` is sanitized by the handler (HtmlSanitizer) before saving
  richText: {
    props: shape({
      html: text(200_000),
    }),
  },
  hero: {
    props: shape({
      title: required(200),
      subtitle: optional(text(500)),
      imageKey: optional(assetKey),
      cta: optional(
        shape({
          label: required(60),
          href,
        }),
      ),
    }),
    notIn: [
      "sidebar",
      "column",
    ],
  },
  image: {
    props: shape({
      assetKey,
      alt: text(300),
      caption: optional(text(300)),
    }),
  },
  gallery: {
    props: shape({
      assetKeys: list(assetKey, 1, 48),
    }),
  },
  // Product category from the shop (ideas/orders/categories), subcategories
  // included; none means every product
  productGrid: {
    props: shape({
      productCategoryId: optional(id),
      limit: int(1, 48),
      sort: oneOf([
        "newest",
        "priceAsc",
        "priceDesc",
      ]),
    }),
    sidebar: (p) =>
      (p.limit as number) > 8 ? "limit at most 8 in a sidebar" : null,
  },
  // Post tag (ideas/posts/tags); none means every post
  postList: {
    props: shape({
      tagId: optional(id),
      limit: int(1, 24),
    }),
  },
  contactForm: {
    props: shape({
      title: optional(text(200)),
      fields: (v) => {
        const r = list(oneOf(CONTACT_FIELDS), 1, CONTACT_FIELDS.length)(v);
        if (!r.ok) {
          return r;
        }
        if (new Set(r.value).size !== r.value.length) {
          return no("has duplicates");
        }
        return r.value.includes("email") || r.value.includes("phone")
          ? r
          : no("needs email or phone, to answer");
      },
      to: optional(email),
    }),
    // Its messages are looked up on the page, not the layout
    notIn: [
      "sidebar",
    ],
  },
  faq: {
    props: shape({
      items: list(
        shape({
          question: required(300),
          answer: required(5000),
        }),
        1,
        50,
      ),
    }),
  },
  // Nested block lists; one level only (no columns inside columns)
  columns: {
    props: shape({
      columns: (v) => list((c) => columnCheck(c), 2, 4)(v),
    }),
    notIn: [
      "sidebar",
      "column",
    ],
  },
} as const satisfies Record<string, TypeSpec>;

export type BlockType = keyof typeof BLOCK_TYPES;

function isBlockType(type: unknown): type is BlockType {
  return typeof type === "string" && Object.hasOwn(BLOCK_TYPES, type);
}

function columnCheck(v: unknown): CheckResult<{
  blocks: Block[];
}> {
  if (!isRecord(v)) {
    return no("must be an object");
  }
  try {
    return ok({
      blocks: checkBlocks(v.blocks, "column"),
    });
  } catch (error) {
    if (error instanceof InvalidPageError) {
      return no(error.message);
    }
    throw error;
  }
}

const BLOCK_ID = /^[A-Za-z0-9_-]{1,40}$/;

// The cleaned list, or InvalidPageError naming the first bad block
export function checkBlocks(raw: unknown, place: BlockPlace): Block[] {
  if (!Array.isArray(raw)) {
    throw new InvalidPageError("blocks must be a list");
  }
  const max = place === "sidebar" ? MAX_SIDEBAR_BLOCKS : MAX_PAGE_BLOCKS;
  if (raw.length > max) {
    throw new InvalidPageError(`At most ${max} blocks`);
  }
  const ids = new Set<string>();
  return raw.map((b, i) => {
    const at = `Block ${i + 1}`;
    if (!isRecord(b)) {
      throw new InvalidPageError(`${at} must be an object`);
    }
    if (typeof b.id !== "string" || !BLOCK_ID.test(b.id)) {
      throw new InvalidPageError(
        `${at}: id must be 1 to 40 letters, digits, - or _`,
      );
    }
    if (ids.has(b.id)) {
      throw new InvalidPageError(`${at}: id ${b.id} is used twice`);
    }
    ids.add(b.id);
    if (!isBlockType(b.type)) {
      throw new InvalidPageError(
        `${at}: type must be one of: ${Object.keys(BLOCK_TYPES).join(", ")}`,
      );
    }
    const spec: TypeSpec = BLOCK_TYPES[b.type];
    if (spec.notIn?.includes(place)) {
      throw new InvalidPageError(
        `${at}: ${b.type} can't be used in a ${place}`,
      );
    }
    const r = spec.props(b.props ?? {});
    if (!r.ok) {
      throw new InvalidPageError(`${at} (${b.type}): ${r.reason}`);
    }
    const extra = place === "sidebar" ? spec.sidebar?.(r.value) : null;
    if (extra) {
      throw new InvalidPageError(`${at} (${b.type}): ${extra}`);
    }
    return {
      id: b.id,
      type: b.type,
      props: r.value,
    };
  });
}

// Every block, columns flattened
function* walk(blocks: Block[]): Generator<Block> {
  for (const b of blocks) {
    yield b;
    if (b.type === "columns") {
      for (const c of b.props.columns as {
        blocks: Block[];
      }[]) {
        yield* walk(c.blocks);
      }
    }
  }
}

// Public keys of every file the blocks show (images, galleries, heroes; rich
// text's are blockAssetKeys): the page's 'inline' asset usages
export function blockFileKeys(blocks: Block[]): string[] {
  const keys = new Set<string>();
  for (const b of walk(blocks)) {
    const p = b.props;
    for (const k of [
      p.imageKey,
      p.assetKey,
      ...((p.assetKeys as string[]) ?? []),
    ]) {
      if (typeof k === "string") {
        keys.add(k);
      }
    }
  }
  return [
    ...keys,
  ];
}

// 'serve/<key>' references inside rich text blocks: also the page's
// 'inline' asset usages
export function blockAssetKeys(blocks: Block[]): string[] {
  const keys = new Set<string>();
  for (const b of walk(blocks)) {
    if (b.type === "richText") {
      for (const k of inlineAssetKeys(b.props.html as string)) {
        keys.add(k);
      }
    }
  }
  return [
    ...keys,
  ];
}

// Rich text cleaned with the given sanitizer (domain stays free of it)
export function sanitizeBlocks(
  blocks: Block[],
  sanitize: (html: string) => string,
): Block[] {
  return blocks.map((b) => {
    if (b.type === "richText") {
      return {
        ...b,
        props: {
          ...b.props,
          html: sanitize(b.props.html as string),
        },
      };
    }
    if (b.type === "columns") {
      const columns = (
        b.props.columns as {
          blocks: Block[];
        }[]
      ).map((c) => ({
        blocks: sanitizeBlocks(c.blocks, sanitize),
      }));
      return {
        ...b,
        props: {
          ...b.props,
          columns,
        },
      };
    }
    return b;
  });
}

export function findBlock(blocks: Block[], blockId: string): Block | null {
  for (const b of walk(blocks)) {
    if (b.id === blockId) {
      return b;
    }
  }
  return null;
}

// What a visitor sends through a contactForm block, checked against the
// fields it lists
export function checkContactMessage(
  block: Block,
  input: Record<string, unknown>,
): Partial<Record<ContactField, string>> {
  const fields = block.props.fields as ContactField[];
  const out: Partial<Record<ContactField, string>> = {};
  const limits: Record<ContactField, Check<string>> = {
    name: text(200),
    email: (v) => (v === undefined || v === "" ? ok("") : email(v)),
    phone: (v) => text(50)(v ?? ""),
    // One line: it goes into the mail's subject
    subject: (v) =>
      typeof v === "string" && /[\r\n]/.test(v)
        ? no("must be a single line")
        : text(255)(v ?? ""),
    message: text(5000),
  };
  for (const f of fields) {
    const r = limits[f](input[f] ?? "");
    if (!r.ok) {
      throw new InvalidContactMessageError(`${f} ${r.reason}`);
    }
    if (r.value) {
      out[f] = r.value;
    }
  }
  if (!out.email && !out.phone) {
    throw new InvalidContactMessageError("Leave an email or phone number");
  }
  if (fields.includes("message") && !out.message) {
    throw new InvalidContactMessageError("message is required");
  }
  return out;
}
