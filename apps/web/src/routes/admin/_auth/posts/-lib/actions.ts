import { call, failState } from "@/lib/admin/call";
import { api, type FormState } from "@/lib/api";
import type { Asset, Post } from "@/lib/types";
import { linkName } from "@/lib/url";

// The web panel's name for a post form's result
export type PostState = FormState;

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "");

// Checked before any request, so a new post isn't created half-saved
function checkTitle(title: string): PostState | null {
  const n = title.trim().length;
  if (n === 0) {
    return {
      fieldErrors: {
        title: "Enter a title.",
      },
    };
  }
  if (n > 255) {
    return {
      fieldErrors: {
        title: "Use at most 255 characters.",
      },
    };
  }
  return null;
}

// The editor form: content fields, then the parent if it changed. Without
// an id (/posts/new) it creates the post first and saves the rest:
// nothing exists until the first save. `createdId` is set then, and the
// caller opens its editor (with the message when the rest failed).
export async function savePost(formData: FormData): Promise<
  PostState & {
    createdId?: string;
  }
> {
  const invalid = checkTitle(field(formData, "title"));
  if (invalid) {
    return invalid;
  }
  if (!field(formData, "id")) {
    const created = await api<Post>("/posts", {
      method: "POST",
      body: {
        title: field(formData, "title").trim(),
        parentId: field(formData, "parentId") || null,
      },
    });
    if (created.status !== "success" || !created.data) {
      return failState(created);
    }
    const newId = created.data.id;
    formData.set("id", newId);
    // Created under its parent already
    formData.set("currentParentId", field(formData, "parentId"));
    const rest = await savePost(formData);
    // The post exists either way; a failed save shows in its editor
    return {
      ...rest,
      createdId: newId,
    };
  }
  const id = field(formData, "id");
  const slug = field(formData, "slug").trim();
  const res = await api<Post>(`/posts/${id}`, {
    method: "PATCH",
    body: {
      title: field(formData, "title").trim(),
      slug: slug || null,
      description: field(formData, "description") || null,
      tags: field(formData, "tags")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      // Not on the new-post form: the content comes after creating
      ...(formData.has("content") && {
        content: field(formData, "content"),
      }),
    },
  });
  if (res.status !== "success") {
    return failState(res);
  }
  const parentId = field(formData, "parentId") || null;
  if (parentId !== (field(formData, "currentParentId") || null)) {
    const moved = await api(`/posts/${id}/move`, {
      method: "POST",
      body: {
        parentId,
      },
    });
    if (moved.status !== "success") {
      return failState(moved);
    }
  }
  return {
    ok: true,
    message: "Saved.",
  };
}

export function publishPost(id: string, at?: string): Promise<PostState> {
  return call(
    `/posts/${id}/publish`,
    {
      method: "POST",
      body: at
        ? {
            at: new Date(at).toISOString(),
          }
        : {},
    },
    at ? "Scheduled." : "Published.",
  );
}

export function unpublishPost(id: string): Promise<PostState> {
  return call(
    `/posts/${id}/unpublish`,
    {
      method: "POST",
    },
    "Back to draft.",
  );
}

export function removePost(id: string): Promise<PostState> {
  return call(
    `/posts/${id}`,
    {
      method: "DELETE",
    },
    "Deleted.",
  );
}

// The post's own folder in the media library (created on first use, linked
// to the post); its files, pasted images and cover go there
export async function ensurePostFolder(postId: string): Promise<{
  folderId?: string;
  message?: string;
}> {
  const res = await call<{
    folderId: string;
  }>(
    `/posts/${postId}/folder`,
    {
      method: "POST",
    },
    "",
  );
  return res.data
    ? {
        folderId: res.data.folderId,
      }
    : {
        message: res.message,
      };
}

async function uploadPublicImage(
  postId: string,
  file: File,
): Promise<{
  asset?: Asset;
  message?: string;
}> {
  const body = new FormData();
  body.set("file", file, file.name);
  body.set("visibility", "public");
  const folder = await ensurePostFolder(postId);
  if (!folder.folderId) {
    return {
      message: folder.message,
    };
  }
  body.set("parentId", folder.folderId);
  const res = await call<Asset>(
    "/assets",
    {
      method: "POST",
      body,
    },
    "",
  );
  return res.data
    ? {
        asset: res.data,
      }
    : {
        message: res.message,
      };
}

// TinyMCE's image uploads (paste, drop, the image dialog). Returns the
// 'serve/<key>' reference the content stores (relative to the site's base
// URL); saving the post attaches it as 'inline'. A failure throws: TinyMCE
// shows it and removes the image.
export async function uploadPostImage(
  postId: string,
  file: File,
): Promise<string> {
  const { asset, message } = await uploadPublicImage(postId, file);
  if (!asset?.url) {
    throw new Error(message ?? "Upload failed");
  }
  return `serve/${asset.key}`;
}

// The cover card's Save, one change: a chosen file (uploaded into the
// post's folder), an image URL (a link asset there, nothing is
// downloaded) or removing the cover
export async function saveCover(formData: FormData): Promise<PostState> {
  const id = field(formData, "id");
  if (formData.has("remove")) {
    return removeCover(id);
  }
  const file = formData.get("coverFile");
  const url = field(formData, "coverUrl").trim();
  const invalid = checkCoverUrl(url);
  if (invalid) {
    return invalid;
  }
  let assetId = field(formData, "coverAssetId");
  if (assetId) {
    // A media-library pick: attached as it is
  } else if (file instanceof File && file.size > 0) {
    const { asset, message } = await uploadPublicImage(id, file);
    if (!asset) {
      return {
        message: message ?? "Upload failed.",
      };
    }
    assetId = asset.id;
  } else if (url) {
    const folder = await ensurePostFolder(id);
    if (!folder.folderId) {
      return {
        message: folder.message,
      };
    }
    const created = await call<Asset>(
      "/assets/links",
      {
        method: "POST",
        body: {
          parentId: folder.folderId,
          name: linkName(url),
          url,
        },
      },
      "",
    );
    if (!created.data) {
      return {
        message: created.message ?? "Couldn't add the link.",
      };
    }
    assetId = created.data.id;
  } else {
    return {
      message: "Choose an image first.",
    };
  }
  return call(
    `/posts/${id}/cover`,
    {
      method: "PUT",
      body: {
        assetId,
      },
    },
    "Cover updated.",
  );
}

function checkCoverUrl(url: string): PostState | null {
  return !url ||
    (/^https?:\/\/\S+$/i.test(url) && URL.canParse(url) && url.length <= 2048)
    ? null
    : {
        fieldErrors: {
          coverUrl: "Enter an http or https URL.",
        },
      };
}

export function removeCover(id: string): Promise<PostState> {
  return call(
    `/posts/${id}/cover`,
    {
      method: "PUT",
      body: {
        assetId: null,
      },
    },
    "",
  );
}

// Moves its /posts/tags/<slug> page; refused when another tag has the name
export async function renamePostTag(formData: FormData): Promise<PostState> {
  const name = field(formData, "name").trim();
  if (!name || name.length > 100) {
    return {
      fieldErrors: {
        name: name ? "Use at most 100 characters." : "Enter a name.",
      },
    };
  }
  return call(
    `/posts/tags/${field(formData, "id")}`,
    {
      method: "PATCH",
      body: {
        name,
      },
    },
    "Tag renamed.",
    {
      post_tag_taken: "name",
    },
  );
}

// Posts lose the tag
export function deletePostTag(id: string): Promise<PostState> {
  return call(
    `/posts/tags/${id}`,
    {
      method: "DELETE",
    },
    "Tag deleted.",
  );
}

// The post's text in a non-default locale (ideas/i18n). Empty slug: the
// post keeps its own slug in that locale.
export async function savePostTranslation(
  formData: FormData,
): Promise<PostState> {
  const invalid = checkTitle(field(formData, "title"));
  if (invalid) {
    return invalid;
  }
  const id = field(formData, "id");
  const locale = field(formData, "locale");
  return call(
    `/posts/${id}/translations/${encodeURIComponent(locale)}`,
    {
      method: "PUT",
      body: {
        title: field(formData, "title").trim(),
        slug: field(formData, "slug").trim() || null,
        description: field(formData, "description") || null,
        content: field(formData, "content"),
      },
    },
    "Translation saved.",
  );
}

// The locale shows the default text again
export function deletePostTranslation(
  id: string,
  locale: string,
): Promise<PostState> {
  return call(
    `/posts/${id}/translations/${encodeURIComponent(locale)}`,
    {
      method: "DELETE",
    },
    "Translation removed.",
  );
}
