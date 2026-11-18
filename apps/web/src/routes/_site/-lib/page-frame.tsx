import type { PublicPageView } from "@/lib/site/public-api";
import type { LayoutFields } from "@/lib/types";
import { BlockList, PageContext } from "./block-renderer";

// Frames a page's blocks by its resolved layout (ideas/pages "Layout"). A
// template ignores fields it doesn't use. The site header and footer live in
// routes/_site.tsx, so their styles are switched with CSS on their
// data-site-* attributes.

const WIDTH: Record<LayoutFields["width"], string> = {
  // The site's standard width
  narrow: "max-w-5xl",
  wide: "max-w-6xl",
  full: "max-w-none",
};

const GAP: Record<LayoutFields["spacing"], string> = {
  compact: "gap-6",
  normal: "gap-10",
  relaxed: "gap-16",
};

const BACKGROUND: Record<LayoutFields["background"], string> = {
  default: "",
  muted: "bg-muted/40",
  primary: "bg-primary/5",
};

function chromeCss(layout: LayoutFields): string {
  const header = layout.template === "blank" ? "none" : layout.header;
  const footer = layout.template === "blank" ? "none" : layout.footer;
  const rules: string[] = [];
  if (header === "none") {
    rules.push("[data-site-header]{display:none}");
  }
  if (header === "minimal") {
    rules.push("[data-site-nav]{display:none}");
  }
  if (header === "transparent") {
    rules.push(
      "[data-site-header]{position:absolute;inset-inline:0;top:0;z-index:20;border-color:transparent;background:transparent}",
    );
  }
  if (footer === "none") {
    rules.push("[data-site-footer]{display:none}");
  }
  if (footer === "minimal") {
    rules.push("[data-site-footer-links]{display:none}");
  }
  return rules.join("");
}

export function PageFrame({ page }: { page: PublicPageView }) {
  const { layout, options } = page;
  const showTitle =
    options.showTitle &&
    layout.template !== "landing" &&
    layout.template !== "blank";
  const gap = GAP[layout.spacing];
  const width =
    layout.template === "landing" || layout.template === "blank"
      ? "max-w-none"
      : WIDTH[layout.width];
  const css = chromeCss(layout);
  const sidebar = layout.template === "sidebar" ? layout.sidebar : null;

  const main = (
    <div className="flex min-w-0 flex-col gap-8">
      {showTitle && (
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {page.title}
        </h1>
      )}
      <BlockList blocks={page.blocks} gap={gap} />
    </div>
  );

  return (
    <PageContext.Provider
      value={{
        pageId: page.id,
        blockData: page.blockData ?? {},
      }}
    >
      <div className={`min-h-[60vh] ${BACKGROUND[layout.background]}`}>
        {css && <style>{css}</style>}
        <main
          className={`mx-auto w-full ${width} ${layout.template === "landing" ? "" : "px-4 py-10"}`}
        >
          {sidebar ? (
            <div
              className={`flex flex-col gap-10 md:flex-row ${sidebar.side === "left" ? "md:flex-row-reverse" : ""}`}
            >
              <div className="min-w-0 flex-1">{main}</div>
              <aside className="w-full shrink-0 md:w-72">
                <div className={sidebar.sticky ? "md:sticky md:top-6" : ""}>
                  <BlockList blocks={sidebar.blocks} gap="gap-6" />
                </div>
              </aside>
            </div>
          ) : (
            main
          )}
        </main>
      </div>
    </PageContext.Provider>
  );
}
