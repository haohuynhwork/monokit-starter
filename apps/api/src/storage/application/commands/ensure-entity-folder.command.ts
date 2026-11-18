import { Command } from "@nestjs/cqrs";

// The entity's own folder in the media library, e.g. Posts/hello-world-42 for
// post 42, created on first use and linked as its 'folder' asset usage (so it
// survives renames and moves). Returns the folder id. Callers check that the
// actor may change the entity first.
export class EnsureEntityFolderCommand extends Command<bigint> {
  constructor(
    readonly ownerType: string,
    readonly ownerId: bigint,
    // Shown in the library, e.g. the post's title; the id is appended
    readonly label: string,
  ) {
    super();
  }
}
