import type { CommandBus, QueryBus } from "@nestjs/cqrs";
import { inlineAssetKeys, inlineFileKeys } from "../../common/domain/html.js";
import { SetAssetUsagesCommand } from "../../storage/application/commands/set-asset-usages.command.js";
import { FindPublicFilesByKeysQuery } from "../../storage/application/queries/find-public-files.query.js";

// Images in the content are 'inline' asset usages, as for posts: "where is
// this file used" stays right, and a shown file can't be deleted
export async function syncInlineImages(
  queries: QueryBus,
  commands: CommandBus,
  productId: bigint,
  content: string,
): Promise<void> {
  const assetIds = await queries.execute(
    new FindPublicFilesByKeysQuery(
      inlineFileKeys(content),
      inlineAssetKeys(content),
    ),
  );
  await commands.execute(
    new SetAssetUsagesCommand("product", productId, "inline", assetIds),
  );
}
