import { api } from "@/lib/api";
import type { Page, PageLayout } from "@/lib/types";

// The web panel's page server actions as client calls. Nothing navigates or
// reloads here: callers run `router.invalidate()` after a success, or open
// the page a create returned (`id`).

export type PageState = {
  ok?: boolean;
  message?: string;
  // Shown under the input they belong to (title, slug, name, ...)
  fieldErrors?: Record<string, string>;
};

// Domain error codes that are about one input
const FIELD_OF_CODE: Record<string, string> = {
  reserved_path: "slug",
  path_taken: "slug",
  live_page_needs_slug: "slug",
  page_not_reachable: "slug",
  move_page_into_itself: "parentId",
  page_layout_name_taken: "name",
};

// invalid_page / invalid_page_layout messages, by how they start
const FIELD_OF_MESSAGE: [
  RegExp,
  string,
][] = [
  [
    /^Title /,
    "title",
  ],
  [
    /^Slug /,
    "slug",
  ],
  [
    /^Description /,
    "description",
  ],
  [
    /^Menu order /,
    "menuOrder",
  ],
  [
    /^seo\.title /,
    "seoTitle",
  ],
  [
    /^Name /,
    "name",
  ],
];

// Validation issues by their top-level field, plus domain errors that
// clearly belong to one input
function failState(res: {
  code?: string | null;
  message?: string | null;
  data?: unknown;
}): PageState {
  const issues =
    (
      res.data as
        | {
            issues?: {
              path: string;
              message: string;
            }[];
          }
        | undefined
    )?.issues ?? [];
  const message = issues[0]?.message ?? res.message ?? "Something went wrong.";
  const fieldErrors: Record<string, string> = {};
  for (const i of issues) {
    fieldErrors[i.path.split(".")[0]] ??= i.message;
  }
  const byCode =
    FIELD_OF_CODE[res.code ?? ""] ??
    (res.code === "invalid_page" || res.code === "invalid_page_layout"
      ? FIELD_OF_MESSAGE.find(([re]) => re.test(message))?.[1]
      : undefined);
  if (byCode) {
    fieldErrors[byCode] ??= message;
  }
  return Object.keys(fieldErrors).length
    ? {
        fieldErrors,
      }
    : {
        message,
      };
}

// A staff call; a signed-out session goes to /login (see api())
async function call<T>(
  path: string,
  init: {
    method: string;
    body?: unknown;
  },
): Promise<{
  state: PageState;
  data?: T;
}> {
  const res = await api<T>(path, init);
  if (res.status !== "success") {
    return {
      state: failState(res),
    };
  }
  return {
    state: {
      ok: true,
    },
    data: res.data,
  };
}

export type PageChanges = {
  title: string;
  slug: string | null;
  description: string | null;
  layoutId: string | null;
  showInMenu: boolean;
  menuOrder: number;
  settings: Page["settings"];
};

// The new-page editor's first save: creates the page (under its parent) and
// saves the rest. Nothing exists before this. With `id` the page exists and
// the caller opens its editor, passing `error` when the rest didn't save.
export async function createPage(
  changes: PageChanges,
  parentId: string | null,
): Promise<
  PageState & {
    id?: string;
    error?: string;
  }
> {
  const { state, data } = await call<Page>("/pages", {
    method: "POST",
    body: {
      title: changes.title.trim() || "Untitled",
      parentId,
      layoutId: changes.layoutId,
    },
  });
  if (!data) {
    return state;
  }
  const rest = await savePage(data.id, changes, {
    from: parentId,
    to: parentId,
  });
  // The page exists either way; a failed save shows in its editor
  return rest.ok
    ? {
        ok: true,
        id: data.id,
      }
    : {
        ok: true,
        id: data.id,
        error: rest.message ?? "",
      };
}

// The editor's whole state, then the parent if it changed
export async function savePage(
  id: string,
  changes: PageChanges,
  parent: {
    from: string | null;
    to: string | null;
  },
): Promise<PageState> {
  const { state } = await call(`/pages/${id}`, {
    method: "PATCH",
    body: changes,
  });
  if (!state.ok || parent.from === parent.to) {
    return state.ok
      ? {
          ok: true,
          message: "Saved.",
        }
      : state;
  }
  const moved = await call(`/pages/${id}/move`, {
    method: "POST",
    body: {
      parentId: parent.to,
    },
  });
  return moved.state.ok
    ? {
        ok: true,
        message: "Saved.",
      }
    : moved.state;
}

export async function publishPage(id: string, at?: string): Promise<PageState> {
  const { state } = await call(`/pages/${id}/publish`, {
    method: "POST",
    body: at
      ? {
          at,
        }
      : {},
  });
  return state.ok
    ? {
        ok: true,
        message: at ? "Scheduled." : "Published.",
      }
    : state;
}

export async function unpublishPage(id: string): Promise<PageState> {
  const { state } = await call(`/pages/${id}/unpublish`, {
    method: "POST",
  });
  return state.ok
    ? {
        ok: true,
        message: "Back to draft.",
      }
    : state;
}

// The caller goes back to the list after a success
export async function deletePage(id: string): Promise<PageState> {
  return (
    await call(`/pages/${id}`, {
      method: "DELETE",
    })
  ).state;
}

// The new-layout editor's first save; nothing exists before this. With `id`
// the caller opens the new layout's editor.
export async function createLayout(changes: {
  name: string;
  settings: PageLayout["settings"];
}): Promise<
  PageState & {
    id?: string;
  }
> {
  const { state, data } = await call<PageLayout>("/page-layouts", {
    method: "POST",
    body: {
      ...changes,
      name: changes.name.trim() || "Untitled layout",
    },
  });
  return data
    ? {
        ok: true,
        id: data.id,
      }
    : state;
}

export async function saveLayout(
  id: string,
  changes: {
    name: string;
    settings: PageLayout["settings"];
  },
): Promise<PageState> {
  const { state } = await call(`/page-layouts/${id}`, {
    method: "PATCH",
    body: changes,
  });
  return state.ok
    ? {
        ok: true,
        message: "Saved.",
      }
    : state;
}

export async function makeDefaultLayout(id: string): Promise<PageState> {
  return (
    await call(`/page-layouts/${id}/default`, {
      method: "POST",
    })
  ).state;
}

// The caller goes back to the layouts after a success
export async function deleteLayout(id: string): Promise<PageState> {
  return (
    await call(`/page-layouts/${id}`, {
      method: "DELETE",
    })
  ).state;
}
