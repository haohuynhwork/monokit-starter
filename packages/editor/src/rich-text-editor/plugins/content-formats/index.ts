import type { Editor } from "tinymce";

// The alignment formats, defined here instead of left to TinyMCE's defaults,
// so every class the editor writes into content is listed in our code and
// styled by content.css (shared with the site). Otherwise their styles come
// from the editor skin's content.min.css, which the site never loads.
//
// Same as TinyMCE 8's defaults; captioned images (figure.image) get a class,
// everything else inline styles.
export const FIGURE_ALIGN_CLASSES = {
  left: "align-left",
  center: "align-center",
  right: "align-right",
} as const;

// TinyMCE's Format type (not exported at the top level)
type Format = Exclude<
  NonNullable<Parameters<Editor["formatter"]["register"]>[1]>,
  unknown[]
>;

const BLOCKS = "figure,p,h1,h2,h3,h4,h5,h6,td,th,tr,div,ul,ol,li,pre";
const EMBEDS = ".mce-preview-object,[data-ephox-embed-iri],.tiny-pageembed";

export function contentFormatsPlugin(editor: Editor): void {
  editor.on("PreInit", () => {
    // Tables use margins; a float left from older content would fight them
    const dropFloat = (table: Node) =>
      editor.dom.setStyle(table as HTMLElement, "float", null);
    const figure = (side: keyof typeof FIGURE_ALIGN_CLASSES): Format => ({
      selector: "figure.image",
      collapsed: false,
      classes: FIGURE_ALIGN_CLASSES[side],
      ceFalseOverride: true,
      preview: "font-family font-size",
    });
    const text = (textAlign: string): Format => ({
      selector: BLOCKS,
      styles: {
        textAlign,
      },
      inherit: false,
      preview: "font-family font-size",
    });
    const float = (side: "left" | "right"): Format[] => [
      {
        selector: "img,audio,video",
        collapsed: false,
        styles: {
          float: side,
        },
        preview: "font-family font-size",
      },
      {
        selector: ".mce-placeholder",
        styles: {
          float: side,
        },
        ceFalseOverride: true,
      },
      {
        selector: "table",
        collapsed: false,
        styles:
          side === "left"
            ? {
                marginLeft: "0px",
                marginRight: "auto",
              }
            : {
                marginLeft: "auto",
                marginRight: "0px",
              },
        onformat: dropFloat,
        preview: "font-family font-size",
      },
      {
        selector: EMBEDS,
        ceFalseOverride: true,
        styles: {
          float: side,
        },
        preview: false,
      },
    ];
    const centered = {
      display: "block",
      marginLeft: "auto",
      marginRight: "auto",
    };

    editor.formatter.register({
      alignleft: [
        figure("left"),
        text("left"),
        ...float("left"),
      ],
      aligncenter: [
        text("center"),
        figure("center"),
        {
          selector: "img,audio,video",
          collapsed: false,
          styles: centered,
          preview: false,
        },
        {
          selector: ".mce-placeholder",
          styles: centered,
          ceFalseOverride: true,
        },
        {
          selector: "table",
          collapsed: false,
          styles: {
            marginLeft: "auto",
            marginRight: "auto",
          },
          preview: "font-family font-size",
        },
        {
          selector: EMBEDS,
          ceFalseOverride: true,
          styles: {
            ...centered,
            display: "table",
          },
          preview: false,
        },
      ],
      alignright: [
        figure("right"),
        text("right"),
        ...float("right"),
      ],
      alignjustify: [
        text("justify"),
      ],
    });
  });
}
