import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import { sqlError } from "../../common/infrastructure/sql-error.js";
import { RegionCodeTakenError } from "../domain/geo.errors.js";
import { Region } from "../domain/region.js";
import type { RegionRepository } from "../domain/region.repository.js";

const FIELDS = [
  "id",
  "countryCode",
  "parentId",
  "code",
  "name",
  "position",
  "active",
] as const;

function codeTaken(error: unknown): never {
  if (sqlError(error)?.sqlState === "23505") {
    throw new RegionCodeTakenError();
  }
  throw error;
}

@Injectable()
export class PrismaRegionRepository implements RegionRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async findById(id: bigint): Promise<Region | null> {
    const row = await this.db.orm.public.Region.select(...FIELDS)
      .where({
        id,
      })
      .first();
    return row ? Region.restore(row) : null;
  }

  async ancestorIds(id: bigint): Promise<bigint[]> {
    const rows = await this.db.query(
      this.db.raw.sql`WITH RECURSIVE up AS (
          SELECT "id", "parentId", 0 AS "depth" FROM "public"."Region" WHERE "id" = ${id}
          UNION ALL
          SELECT r."id", r."parentId", up."depth" + 1 FROM "public"."Region" r
          JOIN up ON r."id" = up."parentId" WHERE up."depth" < 100
        ) SELECT "id" FROM up ORDER BY "depth"`
        .returnsRow({
          id: "pg/int8@1",
        })
        .build(),
    );
    return rows.map((r) => BigInt(String(r.id)));
  }

  async isInUse(region: Region): Promise<boolean> {
    const { id, code } = region.snapshot();
    if (id === null) {
      return false;
    }
    const [child, address] = await Promise.all([
      this.db.orm.public.Region.select("id")
        .where({
          parentId: id,
        })
        .first(),
      this.db.orm.public.Address.select("id")
        .where({
          regionCode: code,
        })
        .first(),
    ]);
    return child !== null || address !== null;
  }

  async hasCountry(countryCode: string): Promise<boolean> {
    const row = await this.db.orm.public.Region.select("id")
      .where({
        countryCode,
      })
      .first();
    return row !== null;
  }

  async save(region: Region): Promise<void> {
    const { id, ...props } = region.snapshot();
    try {
      if (id === null) {
        const row = await this.db.orm.public.Region.select("id").create(props);
        region.assignId(row.id);
      } else {
        await this.db.orm.public.Region.where({
          id,
        }).update(props);
      }
    } catch (error) {
      codeTaken(error);
    }
  }

  async insertMany(regions: Region[]): Promise<void> {
    try {
      await this.db.transaction(async (tx) => {
        for (const region of regions) {
          const { id: _, ...props } = region.snapshot();
          const row = await tx.orm.public.Region.select("id").create(props);
          region.assignId(row.id);
        }
      });
    } catch (error) {
      codeTaken(error);
    }
  }

  async delete(id: bigint): Promise<void> {
    await this.db.orm.public.Region.where({
      id,
    }).deleteAll();
  }
}
