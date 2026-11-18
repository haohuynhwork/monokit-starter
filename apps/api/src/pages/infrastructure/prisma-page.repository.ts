import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import { PathTakenError } from "../../common/domain/paths.js";
import { sqlError } from "../../common/infrastructure/sql-error.js";
import { LiveDescendantPageNeedsPathError } from "../domain/page.errors.js";
import { Page } from "../domain/page.js";
import type { PageRepository } from "../domain/page.repository.js";
import { fromStored, toStored } from "../domain/page-settings.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const FIELDS = [
  "id",
  "parentId",
  "authorId",
  "layoutId",
  "title",
  "slug",
  "description",
  "settings",
  "status",
  "publishedAt",
  "showInMenu",
  "menuOrder",
  "deletedAt",
] as const;

// Same tree upkeep as PrismaPostRepository, on Page / PageClosure
@Injectable()
export class PrismaPageRepository implements PageRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async findById(id: bigint): Promise<Page | null> {
    const row = await this.db.orm.public.Page.select(...FIELDS)
      .where({
        id,
      })
      .where((p) => p.deletedAt.isNull())
      .first();
    if (!row) {
      return null;
    }
    return Page.restore({
      ...row,
      settings: fromStored(row.settings),
    });
  }

  async save(page: Page): Promise<void> {
    try {
      await this.db.transaction((tx) =>
        page.id === null ? this.insert(tx, page) : this.update(tx, page),
      );
    } catch (error) {
      const e = sqlError(error);
      // pages_full_slug_unique
      if (e?.sqlState === "23505") {
        throw new PathTakenError("page");
      }
      // pages_live_has_url on a live page below this one
      if (
        e?.sqlState === "23514" &&
        e.constraint?.startsWith("pages_live_has_url")
      ) {
        throw new LiveDescendantPageNeedsPathError();
      }
      throw error;
    }
  }

  async pathOf(pageId: bigint | null): Promise<string | null> {
    if (pageId === null) {
      return "";
    }
    const row = await this.db.orm.public.Page.select("fullSlug")
      .where({
        id: pageId,
      })
      .first();
    return row?.fullSlug ?? null;
  }

  async isInSubtree(rootId: bigint, nodeId: bigint): Promise<boolean> {
    const row = await this.db.orm.public.PageClosure.where({
      ancestorId: rootId,
      descendantId: nodeId,
    }).first();
    return row !== null;
  }

  async hasLiveChildren(pageId: bigint): Promise<boolean> {
    const row = await this.db.orm.public.Page.select("id")
      .where({
        parentId: pageId,
      })
      .where((p) => p.deletedAt.isNull())
      .first();
    return row !== null;
  }

  private row(page: Page) {
    const { id: _, settings, ...props } = page.snapshot();
    return {
      ...props,
      settings: toStored(settings) as never,
    };
  }

  private async insert(tx: Tx, page: Page): Promise<void> {
    const props = this.row(page);
    const row = await tx.orm.public.Page.select("id").create(props);
    page.assignId(row.id);
    await tx.orm.public.PageClosure.create({
      ancestorId: row.id,
      descendantId: row.id,
      depth: 0,
    });
    if (props.parentId !== null) {
      await tx.execute(
        tx.raw
          .sql`INSERT INTO "public"."PageClosure" ("ancestorId", "descendantId", "depth")
          SELECT "ancestorId", ${row.id}, "depth" + 1 FROM "public"."PageClosure"
          WHERE "descendantId" = ${props.parentId}`
          .affectedCount()
          .build(),
      );
    }
    await this.recomputePaths(tx, row.id);
  }

  private async update(tx: Tx, page: Page): Promise<void> {
    const pageId = page.id!;
    const props = this.row(page);
    const before = await tx.orm.public.Page.select("parentId", "slug")
      .where({
        id: pageId,
      })
      .forNoKeyUpdate()
      .first();
    await tx.orm.public.Page.where({
      id: pageId,
    }).update(props);
    if (!before) {
      return;
    }
    if (before.parentId !== props.parentId) {
      await this.relink(tx, pageId, props.parentId);
    }
    if (before.parentId !== props.parentId || before.slug !== props.slug) {
      await this.recomputePaths(tx, pageId);
    }
  }

  private async relink(tx: Tx, id: bigint, parentId: bigint | null) {
    await tx.execute(
      tx.raw.sql`DELETE FROM "public"."PageClosure"
        WHERE "descendantId" IN (
          SELECT "descendantId" FROM "public"."PageClosure" WHERE "ancestorId" = ${id})
        AND "ancestorId" NOT IN (
          SELECT "descendantId" FROM "public"."PageClosure" WHERE "ancestorId" = ${id})`
        .affectedCount()
        .build(),
    );
    if (parentId !== null) {
      await tx.execute(
        tx.raw
          .sql`INSERT INTO "public"."PageClosure" ("ancestorId", "descendantId", "depth")
          SELECT p."ancestorId", s."descendantId", p."depth" + s."depth" + 1
          FROM "public"."PageClosure" p
          CROSS JOIN "public"."PageClosure" s
          WHERE p."descendantId" = ${parentId} AND s."ancestorId" = ${id}`
          .affectedCount()
          .build(),
      );
    }
  }

  private async recomputePaths(tx: Tx, id: bigint): Promise<void> {
    await tx.execute(
      tx.raw.sql`UPDATE "public"."Page" p SET "fullSlug" = sub."path"
        FROM (
          SELECT n."descendantId" AS "id",
            CASE WHEN bool_and(a."slug" IS NOT NULL)
              THEN string_agg(a."slug", '/' ORDER BY chain."depth" DESC)
            END AS "path"
          FROM "public"."PageClosure" n
          JOIN "public"."PageClosure" chain ON chain."descendantId" = n."descendantId"
          JOIN "public"."Page" a ON a."id" = chain."ancestorId"
          WHERE n."ancestorId" = ${id}
          GROUP BY n."descendantId"
        ) sub
        WHERE p."id" = sub."id" AND p."fullSlug" IS DISTINCT FROM sub."path"`
        .affectedCount()
        .build(),
    );
  }
}
