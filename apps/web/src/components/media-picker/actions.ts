import type { BrowseOptions, ItemResult } from "@packages/editor/host";
import { api } from "@/lib/api";
import type { Asset, AssetListing } from "@/lib/types";

// The media library calls, straight to the api (the web panel ran them as
// server actions)

// One page of a folder of the media library (null: the top level)
export async function browseMedia(options: BrowseOptions): Promise<{
  listing?: AssetListing;
  message?: string;
}> {
  const { folderId, q, ...rest } = options;
  const query = new URLSearchParams(
    Object.entries(rest).map(([k, v]) => [
      k,
      String(v),
    ]),
  );
  if (folderId) {
    query.set("folderId", folderId);
  }
  if (q?.trim()) {
    query.set("q", q.trim());
  }
  const res = await api<AssetListing>(`/assets?${query}`);
  if (res.status !== "success" || !res.data) {
    return {
      message: res.message ?? "Could not load the media library.",
    };
  }
  return {
    listing: res.data,
  };
}

// Uploads a public file into the folder being browsed
export async function uploadToFolder(formData: FormData): Promise<{
  asset?: Asset;
  message?: string;
}> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      message: "Choose a file first.",
    };
  }
  const body = new FormData();
  body.set("file", file, file.name);
  // Posts are public pages; private files would not show there
  body.set("visibility", "public");
  const folderId = String(formData.get("folderId") ?? "");
  if (folderId) {
    body.set("parentId", folderId);
  }
  const res = await api<Asset>("/assets", {
    method: "POST",
    body,
  });
  if (res.status !== "success" || !res.data) {
    const issues = (
      res.data as
        | {
            issues?: {
              message: string;
            }[];
          }
        | undefined
    )?.issues;
    return {
      message: issues?.[0]?.message ?? res.message ?? "Upload failed.",
    };
  }
  return {
    asset: res.data,
  };
}

// Domain error codes that are about one input
const FIELD_OF_CODE: Record<string, "name" | "url"> = {
  invalid_name: "name",
  name_taken: "name",
  invalid_link_url: "url",
};

async function call(
  path: string,
  init: {
    method: string;
    body?: unknown;
  },
): Promise<ItemResult> {
  const res = await api(path, init);
  if (res.status === "success") {
    return {
      ok: true,
    };
  }
  const issues = (
    res.data as
      | {
          issues?: {
            path: string;
            message: string;
          }[];
        }
      | undefined
  )?.issues;
  const top = issues?.[0]?.path.split(".")[0];
  return {
    message: issues?.[0]?.message ?? res.message ?? "Something went wrong.",
    field:
      top === "name" || top === "url" ? top : FIELD_OF_CODE[res.code ?? ""],
  };
}

// The api checks who may change what (authors: only their own items)
export async function createFolderIn(
  parentId: string | null,
  name: string,
): Promise<ItemResult> {
  return call("/assets/folders", {
    method: "POST",
    // Inside a post's scope, content is public
    body: {
      parentId,
      name,
      visibility: "public",
    },
  });
}

export async function renameItem(
  id: string,
  name: string,
): Promise<ItemResult> {
  return call(`/assets/${id}`, {
    method: "PATCH",
    body: {
      name,
    },
  });
}

export async function deleteItem(id: string): Promise<ItemResult> {
  return call(`/assets/${id}`, {
    method: "DELETE",
  });
}

// Links are always public: they point at something public elsewhere
export async function createLinkIn(
  parentId: string | null,
  name: string,
  url: string,
): Promise<ItemResult> {
  return call("/assets/links", {
    method: "POST",
    body: {
      parentId,
      name,
      url,
    },
  });
}

export async function updateLink(
  id: string,
  name: string,
  url: string,
): Promise<ItemResult> {
  return call(`/assets/${id}`, {
    method: "PATCH",
    body: {
      name,
      url,
    },
  });
}
