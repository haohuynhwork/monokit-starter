import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import { sqlError } from "../../common/infrastructure/sql-error.js";
import {
  AssetInUseError,
  AssetNotFoundError,
  NameTakenError,
} from "../domain/asset.errors.js";
import type { AssetNode, AssetVisibility } from "../domain/asset.js";
import type {
  AssetRepository,
  NewAsset,
  StoredLocation,
} from "../domain/asset.repository.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const TEXT = "pg/text@1";
const NODE_FIELDS = [
  "id",
  "parentId",
  "kind",
  "visibility",
  "slug",
  "fullSlug",
  "filename",
  "createdById",
] as const;

@Injectable()
export class PrismaAssetRepository implements AssetRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async findById(id: bigint): Promise<AssetNode | null> {
    return this.db.orm.public.Asset.select(...NODE_FIELDS)
      .where({
        id,
      })
      .first();
  }

  async findRootFolder(slug: string): Promise<AssetNode | null> {
    return this.db.orm.public.Asset.select(...NODE_FIELDS)
      .where({
        slug,
        kind: "directory",
      })
      .where((a) => a.parentId.isNull())
      .first();
  }

  async isInSubtree(rootId: bigint, nodeId: bigint): Promise<boolean> {
    const row = await this.db.orm.public.AssetClosure.where({
      ancestorId: rootId,
      descendantId: nodeId,
    }).first();
    return row !== null;
  }

  async freeSlug(
    parentId: bigint | null,
    candidates: string[],
  ): Promise<string> {
    const taken = await this.db.orm.public.Asset.select("slug")
      .where((a) =>
        parentId === null ? a.parentId.isNull() : a.parentId.eq(parentId),
      )
      // Slugs are Varchar<255> in the contract; candidates are plain strings
      .where((a) => a.slug.in(candidates as never[]))
      .all();
    const used = new Set<string>(taken.map((t) => t.slug));
    const free = candidates.find((c) => !used.has(c));
    if (!free) {
      throw new NameTakenError();
    }
    return free;
  }

  create(asset: NewAsset): Promise<bigint> {
    return this.write(async (tx) => {
      const parentFull = await this.fullSlugOf(tx, asset.parentId);
      const row = await tx.orm.public.Asset.select("id").create({
        ...asset,
        key: asset.key ?? randomUUID(),
        fullSlug: join(parentFull, asset.slug),
      });
      // The self row, plus the parent's ancestors one level further
      await tx.orm.public.AssetClosure.create({
        ancestorId: row.id,
        descendantId: row.id,
        depth: 0,
      });
      if (asset.parentId !== null) {
        await tx.execute(
          tx.raw
            .sql`INSERT INTO "public"."AssetClosure" ("ancestorId", "descendantId", "depth")
            SELECT "ancestorId", ${row.id}, "depth" + 1 FROM "public"."AssetClosure"
            WHERE "descendantId" = ${asset.parentId}`
            .affectedCount()
            .build(),
        );
      }
      return row.id;
    });
  }

  rename(id: bigint, slug: string, filename: string): Promise<void> {
    return this.write(async (tx) => {
      const node = await this.lock(tx, id);
      await tx.orm.public.Asset.where({
        id,
      }).update({
        slug,
        filename,
      });
      const parentFull = await this.fullSlugOf(tx, node.parentId);
      await this.rewriteFullSlugs(
        tx,
        id,
        node.fullSlug,
        join(parentFull, slug),
      );
    });
  }

  move(id: bigint, parentId: bigint | null): Promise<void> {
    return this.write(async (tx) => {
      const node = await this.lock(tx, id);
      // Cut the subtree off its old ancestors, keeping links inside it
      await tx.execute(
        tx.raw.sql`DELETE FROM "public"."AssetClosure"
          WHERE "descendantId" IN (
            SELECT "descendantId" FROM "public"."AssetClosure" WHERE "ancestorId" = ${id})
          AND "ancestorId" NOT IN (
            SELECT "descendantId" FROM "public"."AssetClosure" WHERE "ancestorId" = ${id})`
          .affectedCount()
          .build(),
      );
      if (parentId !== null) {
        // Every new ancestor to every node of the subtree, depths added
        await tx.execute(
          tx.raw
            .sql`INSERT INTO "public"."AssetClosure" ("ancestorId", "descendantId", "depth")
            SELECT p."ancestorId", s."descendantId", p."depth" + s."depth" + 1
            FROM "public"."AssetClosure" p
            CROSS JOIN "public"."AssetClosure" s
            WHERE p."descendantId" = ${parentId} AND s."ancestorId" = ${id}`
            .affectedCount()
            .build(),
        );
      }
      await tx.orm.public.Asset.where({
        id,
      }).update({
        parentId,
      });
      const parentFull = await this.fullSlugOf(tx, parentId);
      await this.rewriteFullSlugs(
        tx,
        id,
        node.fullSlug,
        join(parentFull, node.slug),
      );
    });
  }

  async setVisibility(id: bigint, visibility: AssetVisibility): Promise<void> {
    const row = await this.db.orm.public.Asset.where({
      id,
    })
      .select("id")
      .update({
        visibility,
      });
    if (!row) {
      throw new AssetNotFoundError();
    }
  }

  async setLinkUrl(id: bigint, url: string): Promise<void> {
    const row = await this.db.orm.public.Asset.where({
      id,
      kind: "link",
    })
      .select("id")
      .update({
        url,
      });
    if (!row) {
      throw new AssetNotFoundError();
    }
  }

  deleteSubtree(id: bigint): Promise<StoredLocation[]> {
    return this.write(async (tx) => {
      const rows = await tx.query(
        tx.raw.sql`SELECT a."storage", a."storageKey" FROM "public"."Asset" a
          JOIN "public"."AssetClosure" c ON c."descendantId" = a."id"
          WHERE c."ancestorId" = ${id} AND a."kind" = 'file'`
          .returnsRow({
            storage: TEXT,
            storageKey: TEXT,
          })
          .build(),
      );
      // parentId cascades to the contents, the closure FKs to their rows
      const deleted = await tx.orm.public.Asset.where({
        id,
      })
        .select("id")
        .delete();
      if (!deleted) {
        throw new AssetNotFoundError();
      }
      return rows.map((r) => ({
        storage: String(r.storage),
        storageKey: String(r.storageKey),
      }));
    });
  }

  // fullSlug of the asset and all its descendants: swap the old prefix.
  // Found through the closure table, never by prefix-matching paths.
  private async rewriteFullSlugs(
    tx: Tx,
    id: bigint,
    oldFull: string,
    newFull: string,
  ): Promise<void> {
    if (oldFull === newFull) {
      return;
    }
    await tx.execute(
      tx.raw.sql`UPDATE "public"."Asset" a
        SET "fullSlug" = ${newFull} || substr(a."fullSlug", ${oldFull.length + 1})
        FROM "public"."AssetClosure" c
        WHERE c."ancestorId" = ${id} AND c."descendantId" = a."id"`
        .affectedCount()
        .build(),
    );
  }

  private async lock(tx: Tx, id: bigint) {
    const node = await tx.orm.public.Asset.select(
      "parentId",
      "slug",
      "fullSlug",
    )
      .where({
        id,
      })
      .forNoKeyUpdate()
      .first();
    if (!node) {
      throw new AssetNotFoundError();
    }
    return node;
  }

  private async fullSlugOf(tx: Tx, id: bigint | null): Promise<string | null> {
    if (id === null) {
      return null;
    }
    const row = await tx.orm.public.Asset.select("fullSlug")
      .where({
        id,
      })
      .first();
    if (!row) {
      throw new AssetNotFoundError();
    }
    return row.fullSlug;
  }

  private async write<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    try {
      return await this.db.transaction(fn);
    } catch (error) {
      const e = sqlError(error);
      if (e?.sqlState === "23505" && !e.constraint?.includes("storageKey")) {
        throw new NameTakenError();
      }
      // A row still points at it (AssetUsage, or a table like
      // ProductGalleryItem with its own assetId): RESTRICT raises 23001,
      // NO ACTION 23503
      if (
        (e?.sqlState === "23001" || e?.sqlState === "23503") &&
        e.constraint?.endsWith("_assetId_fkey")
      ) {
        throw new AssetInUseError();
      }
      throw error;
    }
  }
}

const join = (parentFull: string | null, slug: string) =>
  parentFull === null ? slug : `${parentFull}/${slug}`;
