import {
  bool,
  type Check,
  int,
  isRecord,
  nullable,
  text,
} from "../../common/domain/checks.js";
import { type Block, blockFileKeys, checkBlocks } from "./block-types.js";
import { InvalidPageError } from "./page.errors.js";
import { checkPageOverrides, type PageLayoutOverrides } from "./page-layout.js";

// A page's `settings` column (ideas/pages "Settings"): the format version,
// layout overrides, whole-page options and the blocks, saved as one snapshot

export const SETTINGS_VERSION = 1;

const assetKey: Check<string> = (v) =>
  typeof v === "string" && /^[^\s?#]{1,512}$/.test(v)
    ? {
        ok: true,
        value: v,
      }
    : {
        ok: false,
        reason: "must be a file from the media library",
      };

// Whole-page options: no order, one of each; a missing key is the default
export const PAGE_OPTIONS = {
  showTitle: {
    default: true,
    check: bool,
  },
  "seo.title": {
    default: null,
    check: nullable(text(70)),
  },
  "seo.imageKey": {
    default: null,
    check: nullable(assetKey),
  },
  "seo.noindex": {
    default: false,
    check: bool,
  },
  "cache.revalidate": {
    default: 300,
    check: int(0, 86_400),
  },
} as const;

export type PageOptions = {
  showTitle: boolean;
  "seo.title": string | null;
  "seo.imageKey": string | null;
  "seo.noindex": boolean;
  "cache.revalidate": number;
};
type OptionKey = keyof PageOptions;

export interface PageSettings {
  version: number;
  layout: PageLayoutOverrides;
  options: Partial<PageOptions>;
  blocks: Block[];
}

const MAX_JSON = 500_000;

// Raw JSON from the panel (or a stored older version) -> checked settings
export function checkPageSettings(raw: unknown): PageSettings {
  if (!isRecord(raw)) {
    throw new InvalidPageError("settings must be an object");
  }
  if (JSON.stringify(raw).length > MAX_JSON) {
    throw new InvalidPageError("settings must be at most 500 KB");
  }
  const { version: _, layout, blocks, ...rest } = raw;
  const options: Partial<PageOptions> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (!Object.hasOwn(PAGE_OPTIONS, key)) {
      throw new InvalidPageError(`Unknown page option: ${key}`);
    }
    if (value === null && PAGE_OPTIONS[key as OptionKey].default !== null) {
      // null resets to the default
      continue;
    }
    const r = (PAGE_OPTIONS[key as OptionKey].check as Check<unknown>)(value);
    if (!r.ok) {
      throw new InvalidPageError(`${key} ${r.reason}`);
    }
    (options as Record<string, unknown>)[key] = r.value;
  }
  return {
    version: SETTINGS_VERSION,
    layout: checkPageOverrides(layout, (m) => new InvalidPageError(m)),
    options,
    blocks: checkBlocks(blocks ?? [], "main"),
  };
}

export function emptySettings(): PageSettings {
  return {
    version: SETTINGS_VERSION,
    layout: {},
    options: {},
    blocks: [],
  };
}

// Stored shape: options sit at the top level next to version/layout/blocks
export function toStored(s: PageSettings): Record<string, unknown> {
  return {
    version: s.version,
    layout: s.layout,
    ...s.options,
    blocks: s.blocks,
  };
}

// Stored rows were checked on write; older versions would be upgraded here
export function fromStored(raw: unknown): PageSettings {
  return checkPageSettings(raw);
}

export function resolveOptions(s: PageSettings): PageOptions {
  const out = Object.fromEntries(
    Object.entries(PAGE_OPTIONS).map(([k, spec]) => [
      k,
      spec.default,
    ]),
  ) as PageOptions;
  return {
    ...out,
    ...s.options,
  };
}

export function settingsFileKeys(s: PageSettings): string[] {
  const keys = new Set(blockFileKeys(s.blocks));
  if (s.options["seo.imageKey"]) {
    keys.add(s.options["seo.imageKey"]);
  }
  return [
    ...keys,
  ];
}
