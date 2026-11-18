import {
  bool,
  type Check,
  isRecord,
  oneOf,
} from "../../common/domain/checks.js";
import {
  type Block,
  blockAssetKeys,
  blockFileKeys,
  checkBlocks,
} from "./block-types.js";
import {
  InvalidPageLayoutError,
  LayoutInUseError,
  LayoutIsDefaultError,
  SidebarNeedsTemplateError,
} from "./page.errors.js";

// How a page is framed around its blocks (ideas/pages "Layout"). Layouts are
// shared rows; a page picks one and may override the fields in PAGE_FIELDS.

export const TEMPLATES = [
  "default",
  "landing",
  "sidebar",
  "blank",
] as const;
export type Template = (typeof TEMPLATES)[number];

export interface Sidebar {
  side: "left" | "right";
  sticky: boolean;
  blocks: Block[];
}

export interface LayoutFields {
  template: Template;
  width: "narrow" | "wide" | "full";
  header: "default" | "transparent" | "minimal" | "none";
  footer: "default" | "minimal" | "none";
  background: "default" | "muted" | "primary";
  spacing: "compact" | "normal" | "relaxed";
  sidebar: Sidebar | null;
}

export const LAYOUT_DEFAULTS: LayoutFields = {
  template: "default",
  width: "narrow",
  header: "default",
  footer: "default",
  background: "default",
  spacing: "normal",
  sidebar: null,
};

const FIELD_CHECKS = {
  template: oneOf(TEMPLATES),
  width: oneOf([
    "narrow",
    "wide",
    "full",
  ]),
  header: oneOf([
    "default",
    "transparent",
    "minimal",
    "none",
  ]),
  footer: oneOf([
    "default",
    "minimal",
    "none",
  ]),
  background: oneOf([
    "default",
    "muted",
    "primary",
  ]),
  spacing: oneOf([
    "compact",
    "normal",
    "relaxed",
  ]),
} as const satisfies Record<string, Check<string>>;

type SimpleField = keyof typeof FIELD_CHECKS;

// What a page may override; template and sidebar are what layouts are
// shared for
export const PAGE_FIELDS = [
  "width",
  "header",
  "footer",
  "background",
  "spacing",
] as const satisfies readonly SimpleField[];
export type PageLayoutOverrides = Partial<
  Pick<LayoutFields, (typeof PAGE_FIELDS)[number]>
>;

export const LAYOUT_VERSION = 1;

// A stored layout row's settings: missing fields mean the code default
export type LayoutSettings = Partial<LayoutFields> & {
  version: number;
};

function checkSimple(
  raw: Record<string, unknown>,
  fields: readonly SimpleField[],
  fail: (m: string) => Error,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    if (raw[f] === undefined || raw[f] === null) {
      continue;
    }
    const r = FIELD_CHECKS[f](raw[f]);
    if (!r.ok) {
      throw fail(`${f} ${r.reason}`);
    }
    out[f] = r.value;
  }
  return out;
}

function checkSidebar(raw: unknown): Sidebar | null {
  if (raw === undefined || raw === null) {
    return null;
  }
  if (!isRecord(raw)) {
    throw new InvalidPageLayoutError("sidebar must be an object");
  }
  const side = oneOf([
    "left",
    "right",
  ])(raw.side ?? "right");
  if (!side.ok) {
    throw new InvalidPageLayoutError(`sidebar.side ${side.reason}`);
  }
  const sticky = bool(raw.sticky ?? false);
  if (!sticky.ok) {
    throw new InvalidPageLayoutError(`sidebar.sticky ${sticky.reason}`);
  }
  return {
    side: side.value,
    sticky: sticky.value,
    blocks: checkBlocks(raw.blocks ?? [], "sidebar"),
  };
}

// A layout row's settings; unknown fields are refused
export function checkLayoutSettings(raw: unknown): LayoutSettings {
  if (!isRecord(raw)) {
    throw new InvalidPageLayoutError("settings must be an object");
  }
  const known = [
    "version",
    "sidebar",
    ...Object.keys(FIELD_CHECKS),
  ];
  const unknown = Object.keys(raw).filter((k) => !known.includes(k));
  if (unknown.length) {
    throw new InvalidPageLayoutError(`Unknown fields: ${unknown.join(", ")}`);
  }
  const out: LayoutSettings = {
    version: LAYOUT_VERSION,
    ...checkSimple(
      raw,
      Object.keys(FIELD_CHECKS) as SimpleField[],
      (m) => new InvalidPageLayoutError(m),
    ),
  };
  const sidebar = checkSidebar(raw.sidebar);
  if (sidebar) {
    if ((out.template ?? LAYOUT_DEFAULTS.template) !== "sidebar") {
      throw new SidebarNeedsTemplateError();
    }
    out.sidebar = sidebar;
  }
  return out;
}

// A page's overrides: only PAGE_FIELDS
export function checkPageOverrides(
  raw: unknown,
  fail: (m: string) => Error,
): PageLayoutOverrides {
  if (raw === undefined || raw === null) {
    return {};
  }
  if (!isRecord(raw)) {
    throw fail("layout must be an object");
  }
  const extra = Object.keys(raw).filter(
    (k) => !(PAGE_FIELDS as readonly string[]).includes(k),
  );
  if (extra.length) {
    throw fail(
      `layout can only override ${PAGE_FIELDS.join(", ")} (template and sidebar come from the layout)`,
    );
  }
  return checkSimple(raw, PAGE_FIELDS, fail) as PageLayoutOverrides;
}

// Page override, then the layout, then the code default. A template's
// unused fields are kept as stored; the renderer ignores them.
export function resolveLayout(
  layout: LayoutSettings | null,
  overrides: PageLayoutOverrides,
): LayoutFields {
  const { version: _, ...stored } = layout ?? {
    version: LAYOUT_VERSION,
  };
  const out = {
    ...LAYOUT_DEFAULTS,
    ...stored,
    ...overrides,
  };
  return {
    ...out,
    sidebar: out.template === "sidebar" ? (out.sidebar ?? null) : null,
  };
}

export interface PageLayoutProps {
  id: bigint | null;
  name: string;
  settings: LayoutSettings;
  isDefault: boolean;
  deletedAt: string | null;
}

export class PageLayout {
  private constructor(private props: PageLayoutProps) {}

  static create(input: { name: string; settings: unknown }): PageLayout {
    return new PageLayout({
      id: null,
      name: checkName(input.name),
      settings: checkLayoutSettings(input.settings),
      isDefault: false,
      deletedAt: null,
    });
  }

  static restore(props: PageLayoutProps): PageLayout {
    return new PageLayout(props);
  }

  get id(): bigint | null {
    return this.props.id;
  }
  get isDefault(): boolean {
    return this.props.isDefault;
  }

  snapshot(): Readonly<PageLayoutProps> {
    return this.props;
  }

  assignId(id: bigint): void {
    this.props.id = id;
  }

  edit(changes: { name?: string; settings?: unknown }): void {
    if (changes.name !== undefined) {
      this.props.name = checkName(changes.name);
    }
    if (changes.settings !== undefined) {
      this.props.settings = checkLayoutSettings(changes.settings);
    }
  }

  // Sanitized sidebar rich text, set by the handler
  replaceSidebarBlocks(blocks: Block[]): void {
    if (this.props.settings.sidebar) {
      this.props.settings = {
        ...this.props.settings,
        sidebar: {
          ...this.props.settings.sidebar,
          blocks,
        },
      };
    }
  }

  sidebarBlocks(): Block[] {
    return this.props.settings.sidebar?.blocks ?? [];
  }

  fileKeys(): string[] {
    return blockFileKeys(this.sidebarBlocks());
  }

  assetKeys(): string[] {
    return blockAssetKeys(this.sidebarBlocks());
  }

  // The repository unsets the old default in the same transaction
  makeDefault(): void {
    this.props.isDefault = true;
  }

  delete(now: Date, usedByPages: boolean): void {
    if (this.props.isDefault) {
      throw new LayoutIsDefaultError();
    }
    if (usedByPages) {
      throw new LayoutInUseError();
    }
    this.props.deletedAt = now.toISOString();
  }
}

function checkName(name: string): string {
  const clean = name.trim();
  if (!clean || clean.length > 100) {
    throw new InvalidPageLayoutError("Name must be 1 to 100 characters");
  }
  return clean;
}
