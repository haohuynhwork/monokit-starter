import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { AssetForbiddenError } from "../../domain/asset.errors.js";
import { CanAccessEntityQuery } from "./can-access-entity.query.js";
import { CheckFolderAccessQuery } from "./check-folder-access.query.js";

// Entity folders (ensure-entity-folder) whose owner decides who may browse
// and change them. Other types (posts) are open to everyone with media access.
// Add a type here together with a CanAccessEntityQuery handler in its context.
const GUARDED_OWNER_TYPES = [
  "product",
];

@QueryHandler(CheckFolderAccessQuery)
export class CheckFolderAccessHandler
  implements IQueryHandler<CheckFolderAccessQuery>
{
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly queries: QueryBus,
  ) {}

  async execute({ assetId, actor }: CheckFolderAccessQuery): Promise<void> {
    if (actor === null || assetId === null) {
      return;
    }
    // The asset and its ancestors (closure table, depth 0 is itself)
    const chain = await this.db.orm.public.AssetClosure.select("ancestorId")
      .where({
        descendantId: assetId,
      })
      .all();
    const ids = chain.map((r) => r.ancestorId);
    if (ids.length === 0) {
      return;
    }
    const owners = await this.db.orm.public.AssetUsage.select(
      "ownerType",
      "ownerId",
    )
      .where((u) => u.assetId.in(ids))
      .where({
        slot: "folder",
      })
      .all();
    for (const owner of owners) {
      if (!GUARDED_OWNER_TYPES.includes(owner.ownerType)) {
        continue;
      }
      const allowed = await this.queries.execute(
        new CanAccessEntityQuery(owner.ownerType, owner.ownerId, actor),
      );
      if (!allowed) {
        throw new AssetForbiddenError();
      }
    }
  }
}
