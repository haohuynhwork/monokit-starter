import type { Asset, AssetListing } from "@packages/contracts";

// What the editors need from the app that hosts them. Each app calls
// configureEditor() once, in the module its code imports the editors from
// (apps/*/src/components/{media-picker,rich-text-editor}/index.ts), so it
// runs before any editor renders, on the server and in the browser.

export interface BrowseOptions {
  folderId: string | null;
  // Searches the folder and everything below it
  q?: string;
  type: "all" | "image";
  sort: "name" | "createdAt" | "size";
  order: "asc" | "desc";
  limit: number;
  offset: number;
}

export type ItemResult = {
  ok?: boolean;
  message?: string;
  // The input the error belongs to, when it clearly is one
  field?: "name" | "url";
};

// The media library calls (web: server actions; panel: fetch to the api)
export interface MediaApi {
  // One page of a folder of the media library (null: the top level)
  browseMedia(options: BrowseOptions): Promise<{
    listing?: AssetListing;
    message?: string;
  }>;
  // Uploads a public file into the folder being browsed (fields: file,
  // folderId)
  uploadToFolder(formData: FormData): Promise<{
    asset?: Asset;
    message?: string;
  }>;
  createFolderIn(parentId: string | null, name: string): Promise<ItemResult>;
  renameItem(id: string, name: string): Promise<ItemResult>;
  deleteItem(id: string): Promise<ItemResult>;
  createLinkIn(
    parentId: string | null,
    name: string,
    url: string,
  ): Promise<ItemResult>;
  updateLink(id: string, name: string, url: string): Promise<ItemResult>;
}

export interface EditorHost {
  media: MediaApi;
  // A body cleaned by the api the way saving would (nothing is stored), for
  // the preview; message when the api can't be reached
  previewContent(html: string): Promise<{
    html?: string;
    message?: string;
  }>;
  // URL of one of the app's own static files: "plugin/tinymce" ->
  // "/cms/plugin/tinymce" (base path aware)
  assetUrl(path: string): string;
  // The same as an absolute URL (TinyMCE's document_base_url)
  absoluteUrl(path: string): string;
  // Namespaced localStorage key
  storageKey(name: string): string;
  notify(
    title: string,
    opts?: {
      description?: string;
      kind?: "success" | "error" | "warning" | "info";
    },
  ): unknown;
}

let current: EditorHost | undefined;

export function configureEditor(host: EditorHost): void {
  current = host;
}

export function editorHost(): EditorHost {
  if (!current) {
    throw new Error(
      "@packages/editor: call configureEditor() before using the editors",
    );
  }
  return current;
}
