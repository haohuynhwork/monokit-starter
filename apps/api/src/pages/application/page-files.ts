import type { CommandBus, QueryBus } from "@nestjs/cqrs";
import { SetAssetUsagesCommand } from "../../storage/application/commands/set-asset-usages.command.js";
import { FindPublicFilesByKeysQuery } from "../../storage/application/queries/find-public-files.query.js";
import { UnknownFilesInPageError } from "../domain/page.errors.js";

// Files shown by blocks are 'inline' asset usages of their page or layout:
// "where is this file used" stays right, and a shown file can't be deleted.
// Public keys (block props and 'serve/<key>' in rich text) of unknown or
// private files are refused before saving.
export async function findFileIds(
  queries: QueryBus,
  keys: string[],
  assetKeys: string[],
): Promise<bigint[]> {
  const wanted = [
    ...new Set([
      ...keys,
      ...assetKeys,
    ]),
  ];
  if (!wanted.length) {
    return [];
  }
  const ids = await queries.execute(new FindPublicFilesByKeysQuery([], wanted));
  if (ids.length !== wanted.length) {
    throw new UnknownFilesInPageError();
  }
  // The same file in a block and in rich text
  return [
    ...new Map(
      ids.map((id) => [
        String(id),
        id,
      ]),
    ).values(),
  ];
}

export function attachFiles(
  commands: CommandBus,
  ownerType: "page" | "page_layout",
  ownerId: bigint,
  assetIds: bigint[],
): Promise<bigint[]> {
  return commands.execute(
    new SetAssetUsagesCommand(ownerType, ownerId, "inline", assetIds),
  );
}
