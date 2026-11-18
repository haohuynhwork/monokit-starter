import type { LayoutFields } from "@/lib/types";

// Choices for layout fields; the first value is the code default (mirrors
// the api's page-layout.ts)
export const LAYOUT_CHOICES = {
  width: {
    label: "Width",
    values: [
      "narrow",
      "wide",
      "full",
    ],
  },
  header: {
    label: "Header",
    values: [
      "default",
      "transparent",
      "minimal",
      "none",
    ],
  },
  footer: {
    label: "Footer",
    values: [
      "default",
      "minimal",
      "none",
    ],
  },
  background: {
    label: "Background",
    values: [
      "default",
      "muted",
      "primary",
    ],
  },
  spacing: {
    label: "Spacing between blocks",
    values: [
      "normal",
      "compact",
      "relaxed",
    ],
  },
} as const satisfies Record<
  Exclude<keyof LayoutFields, "template" | "sidebar">,
  {
    label: string;
    values: readonly string[];
  }
>;

export const TEMPLATE_LABELS: Record<LayoutFields["template"], string> = {
  default: "Default",
  landing: "Landing (full width, no title)",
  sidebar: "With sidebar",
  blank: "Blank (no header, footer or title)",
};
