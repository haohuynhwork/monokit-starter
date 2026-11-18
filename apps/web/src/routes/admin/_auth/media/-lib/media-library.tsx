import { ContextMenuItem } from "@packages/ui/components/context-menu";
import { Field, FieldError, FieldLabel } from "@packages/ui/components/field";
import { useNavigate } from "@tanstack/react-router";
import { FolderInput, Globe, Lock } from "lucide-react";
import { useCallback, useState } from "react";
import { MediaBrowser } from "@/components/media-picker";
import { notify } from "@/components/toast";
import type { Asset, FolderOption, User } from "@/lib/types";
import { moveAsset, setVisibility } from "./actions";
import { FormDialog } from "./form-dialog";

// The media library: the picker's browser, full page, with the library-only
// actions (move, visibility). The open folder is kept in ?folder=.
export function MediaLibrary({
  user,
  initialFolderId,
  folders,
}: {
  user: User;
  initialFolderId: string | null;
  folders: FolderOption[];
}) {
  const [moving, setMoving] = useState<{
    item: Asset;
    reload: () => void;
  } | null>(null);

  const navigate = useNavigate();
  const onFolderChange = useCallback(
    (id: string | null) => {
      // Replaces the entry; the browser keeps its own listing state
      navigate({
        to: "/admin/media",
        // Keeps the other params (e.g. the open picker)
        search: (prev) => ({
          ...prev,
          folder: id ?? undefined,
        }),
        replace: true,
      });
    },
    [
      navigate,
    ],
  );

  // Mirrors the api's rule (checkCanManage); the api enforces it
  const canManage = (item: Asset) =>
    user.role !== "author" || item.createdById === user.id;

  const toggleVisibility = async (item: Asset, reload: () => void) => {
    const next = item.visibility === "public" ? "private" : "public";
    const res = await setVisibility(item.id, next);
    notify(res.ok ? `“${item.name}” is now ${next}` : "Couldn't change it", {
      kind: res.ok ? "success" : "error",
      description: res.ok ? undefined : res.message,
    });
    if (res.ok) {
      reload();
    }
  };

  // Folders it can go into; the api also refuses moves into itself
  const targets = moving
    ? folders.filter(
        (f) => f.id !== moving.item.id && f.id !== moving.item.parentId,
      )
    : [];

  return (
    <>
      <div className="relative flex h-[calc(100svh-10rem)] min-h-[28rem] flex-col overflow-hidden rounded-xl border bg-card">
        <MediaBrowser
          kind="all"
          initialFolderId={initialFolderId}
          onFolderChange={onFolderChange}
          canManage={canManage}
          itemMenu={(item, reload) =>
            canManage(item) && (
              <>
                <ContextMenuItem
                  onSelect={() =>
                    setMoving({
                      item,
                      reload,
                    })
                  }
                >
                  <FolderInput /> Move
                </ContextMenuItem>
                {item.kind !== "link" && item.kind !== "directory" && (
                  <ContextMenuItem
                    onSelect={() => void toggleVisibility(item, reload)}
                  >
                    {item.visibility === "public" ? (
                      <>
                        <Lock /> Make private
                      </>
                    ) : (
                      <>
                        <Globe /> Make public
                      </>
                    )}
                  </ContextMenuItem>
                )}
              </>
            )
          }
        />
      </div>

      {moving && (
        <FormDialog
          key={moving.item.id}
          open
          onOpenChange={(open) => {
            if (!open) {
              setMoving(null);
            }
          }}
          title={`Move “${moving.item.name}”`}
          action={moveAsset}
          hidden={{
            id: moving.item.id,
          }}
          submitLabel="Move"
          onSuccess={moving.reload}
        >
          {(fieldError) => (
            <Field data-invalid={!!fieldError("parentId") || undefined}>
              <FieldLabel htmlFor="move-target">Into folder</FieldLabel>
              <select
                id="move-target"
                name="parentId"
                aria-invalid={!!fieldError("parentId") || undefined}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                defaultValue=""
              >
                {moving.item.parentId !== null && (
                  <option value="">Media (top level)</option>
                )}
                {targets.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.path}
                  </option>
                ))}
              </select>
              <FieldError>{fieldError("parentId")}</FieldError>
            </Field>
          )}
        </FormDialog>
      )}
    </>
  );
}
