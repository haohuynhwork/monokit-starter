// The api's storage views (AssetView / AssetListing / FolderOption)
export type Asset = {
  id: string;
  parentId: string | null;
  kind: "file" | "directory" | "link";
  visibility: "public" | "private";
  name: string;
  slug: string;
  path: string;
  mimeType: string | null;
  sizeBytes: string | null;
  // Public URL, short-lived signed link, or the external link
  url: string | null;
  // Random and permanent: '<uuid>.<ext>' for files, '<uuid>' for folders
  // and links; rich text stores 'serve/<key>' (see PickedFile)
  key: string;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssetListing = {
  folder: Asset | null;
  breadcrumbs: {
    id: string;
    name: string;
  }[];
  items: Asset[];
  // Matching items across all pages
  total: number;
};

export type FolderOption = {
  id: string;
  name: string;
  path: string;
};
