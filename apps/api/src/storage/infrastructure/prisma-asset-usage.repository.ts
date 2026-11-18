import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import { sqlError } from "../../common/infrastructure/sql-error.js";
import {
  AssetAlreadyUsedError,
  AssetNotFoundError,
} from "../domain/asset.errors.js";
import type {
  AssetUsageRepository,
  AssetUsageRow,
  AssetUsageTarget,
} from "../domain/asset-usage.repository.js";

@Injectable()
export class PrismaAssetUsageRepository implements AssetUsageRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async attach(
    target: AssetUsageTarget,
    assetId: bigint,
    opts: {
      single: boolean;
      position: number;
    },
  ): Promise<bigint[]> {
    try {
      return await this.db.transaction(async (tx) => {
        const rows = tx.orm.public.AssetUsage.where({
          ownerType: target.ownerType,
          ownerId: target.ownerId,
          slot: target.slot,
        });
        let replaced: bigint[] = [];
        if (opts.single) {
          const old = await rows.select("assetId").all();
          replaced = old.map((o) => o.assetId).filter((id) => id !== assetId);
          await rows.deleteAll();
        }
        await tx.orm.public.AssetUsage.create({
          ...target,
          assetId,
          position: opts.position,
        });
        return replaced;
      });
    } catch (error) {
      const e = sqlError(error);
      if (e?.sqlState === "23505") {
        throw new AssetAlreadyUsedError();
      }
      if (e?.sqlState === "23503") {
        throw new AssetNotFoundError();
      }
      throw error;
    }
  }

  async replace(
    target: AssetUsageTarget,
    assetIds: bigint[],
  ): Promise<bigint[]> {
    try {
      return await this.db.transaction(async (tx) => {
        const rows = tx.orm.public.AssetUsage.where({
          ownerType: target.ownerType,
          ownerId: target.ownerId,
          slot: target.slot,
        });
        const old = await rows.select("assetId").all();
        await rows.deleteAll();
        for (const [position, assetId] of assetIds.entries()) {
          await tx.orm.public.AssetUsage.create({
            ...target,
            assetId,
            position,
          });
        }
        const kept = new Set(assetIds);
        return old.map((o) => o.assetId).filter((id) => !kept.has(id));
      });
    } catch (error) {
      if (sqlError(error)?.sqlState === "23503") {
        throw new AssetNotFoundError();
      }
      throw error;
    }
  }

  async detach(
    target: Omit<AssetUsageTarget, "slot"> & {
      slot?: string;
    },
  ): Promise<bigint[]> {
    const where = {
      ownerType: target.ownerType,
      ownerId: target.ownerId,
      ...(target.slot !== undefined && {
        slot: target.slot,
      }),
    };
    const rows = await this.db.orm.public.AssetUsage.where(where)
      .select("assetId")
      .all();
    if (rows.length > 0) {
      await this.db.orm.public.AssetUsage.where(where).deleteAll();
    }
    return rows.map((r) => r.assetId);
  }

  async list(
    ownerType: string,
    ownerIds: bigint[],
    slot: string,
  ): Promise<AssetUsageRow[]> {
    if (ownerIds.length === 0) {
      return [];
    }
    return this.db.orm.public.AssetUsage.select(
      "ownerId",
      "assetId",
      "position",
    )
      .where({
        ownerType,
        slot,
      })
      .where((t) => t.ownerId.in(ownerIds))
      .orderBy([
        (t) => t.position.asc(),
        (t) => t.id.asc(),
      ])
      .all();
  }
}
