import { Button } from "@packages/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { AppWindow } from "lucide-react";
import { useState } from "react";
import { MediaPicker } from "@/components/media-picker";
import { notify } from "@/components/toast";
import { api } from "@/lib/api";
import { idParam, oneOf } from "@/lib/search";
import type { FolderOption } from "@/lib/types";
import { MediaLibrary } from "@/routes/admin/_auth/media/-lib/media-library";

export const Route = createFileRoute("/admin/_auth/media/")({
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    folder?: string;
    picker?: "file" | "image";
  } => ({
    // The open folder
    folder: idParam(s.folder),
    // The picker popup, open (as editors see it) while this is set, so a
    // reload or a shared link keeps it open
    picker: oneOf(s.picker, [
      "file",
      "image",
    ] as const),
  }),
  // Move targets; the listing itself loads in the browser
  loader: async () => {
    const folders = await api<FolderOption[]>("/assets/folders");
    return {
      folders: folders.status === "success" && folders.data ? folders.data : [],
    };
  },
  pendingComponent: () => (
    <div className="h-[calc(100svh-10rem)] min-h-[28rem] animate-pulse rounded-xl border bg-muted/40" />
  ),
  component: MediaPage,
});

function MediaPage() {
  const { folders } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  // Only the first value: the browser keeps the folder after that
  const search = Route.useSearch();
  const [initialFolderId] = useState(search.folder ?? null);
  const navigate = Route.useNavigate();
  const setPicker = (picker: "file" | undefined) =>
    navigate({
      search: (prev) => ({
        ...prev,
        picker,
      }),
      replace: true,
    });
  const onPick = (file: { name: string; src: string }) => {
    setPicker(undefined);
    notify(`Picked “${file.name}”`, {
      description: file.src,
    });
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
          <p className="text-sm text-muted-foreground">
            Drop files to upload; right-click an item for more.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setPicker("file")}>
          <AppWindow /> Open picker
        </Button>
      </div>
      <MediaLibrary
        user={user}
        initialFolderId={initialFolderId}
        folders={folders}
      />
      {search.picker && (
        <MediaPicker
          kind={search.picker}
          onPick={onPick}
          onClose={() => setPicker(undefined)}
        />
      )}
    </div>
  );
}
