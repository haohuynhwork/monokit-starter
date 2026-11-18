import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import { sqlError } from "../../common/infrastructure/sql-error.js";
import {
  LiveDescendantNeedsPathError,
  PathTakenError,
} from "../domain/post.errors.js";
import { Post, type PostTranslationProps } from "../domain/post.js";
import type { PostRepository } from "../domain/post.repository.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const FIELDS = [
  "id",
  "parentId",
  "authorId",
  "title",
  "slug",
  "content",
  "description",
  "status",
  "publishedAt",
  "deletedAt",
] as const;

@Injectable()
export class PrismaPostRepository implements PostRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async findById(id: bigint): Promise<Post | null> {
    const row = await this.db.orm.public.Post.select(...FIELDS)
      .where({
        id,
      })
      .where((p) => p.deletedAt.isNull())
      .first();
    if (!row) {
      return null;
    }
    const tags = await this.db.orm.public.PostTagging.select("tagId")
      .where({
        postId: id,
      })
      .orderBy([
        (t) => t.position.asc(),
        (t) => t.tagId.asc(),
      ])
      .all();
    const translations = await this.db.orm.public.PostTranslation.select(
      "localeId",
      "title",
      "slug",
      "content",
      "description",
    )
      .where({
        postId: id,
      })
      .limit(500)
      .all();
    return Post.restore({
      ...row,
      tagIds: tags.map((t) => t.tagId),
      translations,
    });
  }

  async save(post: Post): Promise<void> {
    try {
      await this.db.transaction((tx) =>
        post.id === null ? this.insert(tx, post) : this.update(tx, post),
      );
    } catch (error) {
      const e = sqlError(error);
      // posts_full_slug_unique / post_translations_full_slug_unique: another
      // live post has this path (in that locale)
      if (e?.sqlState === "23505") {
        throw new PathTakenError();
      }
      // posts_live_has_url: the post itself is checked by the domain, so
      // this is a live post below that lost its path
      if (
        e?.sqlState === "23514" &&
        e.constraint?.startsWith("posts_live_has_url")
      ) {
        throw new LiveDescendantNeedsPathError();
      }
      throw error;
    }
  }

  async isReachable(postId: bigint | null): Promise<boolean> {
    if (postId === null) {
      return true;
    }
    const row = await this.db.orm.public.Post.select("fullSlug")
      .where({
        id: postId,
      })
      .first();
    return !!row?.fullSlug;
  }

  async pathIn(
    postId: bigint | null,
    localeId: bigint,
  ): Promise<string | null> {
    if (postId === null) {
      return "";
    }
    // Each ancestor's slug in the locale (its translation's, else its own)
    const [row] = await this.db.query(
      this.db.raw.sql`SELECT
            CASE WHEN bool_and(COALESCE(ta."slug", a."slug") IS NOT NULL)
              THEN string_agg(COALESCE(ta."slug", a."slug"), '/' ORDER BY chain."depth" DESC) END AS "path"
        FROM "public"."PostClosure" chain
        JOIN "public"."Post" a ON a."id" = chain."ancestorId"
        LEFT JOIN "public"."PostTranslation" ta
          ON ta."postId" = a."id" AND ta."localeId" = ${localeId}
        WHERE chain."descendantId" = ${postId}`
        .returnsRow({
          path: "pg/text@1",
        })
        .build(),
    );
    return (row?.path as string | null | undefined) ?? null;
  }

  async pathOf(postId: bigint | null): Promise<string | null> {
    if (postId === null) {
      return "";
    }
    const row = await this.db.orm.public.Post.select("fullSlug")
      .where({
        id: postId,
      })
      .first();
    return row?.fullSlug ?? null;
  }

  async isInSubtree(rootId: bigint, nodeId: bigint): Promise<boolean> {
    const row = await this.db.orm.public.PostClosure.where({
      ancestorId: rootId,
      descendantId: nodeId,
    }).first();
    return row !== null;
  }

  async hasLiveChildren(postId: bigint): Promise<boolean> {
    const row = await this.db.orm.public.Post.select("id")
      .where({
        parentId: postId,
      })
      .where((p) => p.deletedAt.isNull())
      .first();
    return row !== null;
  }

  private async insert(tx: Tx, post: Post): Promise<void> {
    const { id: _, tagIds, translations, ...props } = post.snapshot();
    const row = await tx.orm.public.Post.select("id").create(props);
    post.assignId(row.id);
    await this.setTaggings(tx, row.id, tagIds);
    await this.setTranslations(tx, row.id, translations);
    await tx.orm.public.PostClosure.create({
      ancestorId: row.id,
      descendantId: row.id,
      depth: 0,
    });
    if (props.parentId !== null) {
      await tx.execute(
        tx.raw
          .sql`INSERT INTO "public"."PostClosure" ("ancestorId", "descendantId", "depth")
          SELECT "ancestorId", ${row.id}, "depth" + 1 FROM "public"."PostClosure"
          WHERE "descendantId" = ${props.parentId}`
          .affectedCount()
          .build(),
      );
    }
    await this.recomputePaths(tx, row.id);
    await this.recomputeTranslationPaths(tx, row.id);
  }

  private async update(tx: Tx, post: Post): Promise<void> {
    const { id, tagIds, translations, ...props } = post.snapshot();
    const postId = id!;
    const before = await tx.orm.public.Post.select("parentId", "slug")
      .where({
        id: postId,
      })
      .forNoKeyUpdate()
      .first();
    await tx.orm.public.Post.where({
      id: postId,
    }).update(props);
    await this.setTaggings(tx, postId, tagIds);
    await this.setTranslations(tx, postId, translations);
    if (!before) {
      return;
    }
    if (before.parentId !== props.parentId) {
      await this.relink(tx, postId, props.parentId);
    }
    if (before.parentId !== props.parentId || before.slug !== props.slug) {
      await this.recomputePaths(tx, postId);
    }
    // Cheap (this subtree's translations only), and slugs, deletion or the
    // translations themselves may have changed
    await this.recomputeTranslationPaths(tx, postId);
  }

  // Upserts the post's translations and drops the removed ones (a handful)
  private async setTranslations(
    tx: Tx,
    postId: bigint,
    translations: readonly PostTranslationProps[],
  ) {
    const existing = await tx.orm.public.PostTranslation.select("localeId")
      .where({
        postId,
      })
      .limit(500)
      .all();
    const kept = new Set(translations.map((t) => t.localeId));
    for (const { localeId } of existing) {
      if (!kept.has(localeId)) {
        await tx.orm.public.PostTranslation.where({
          postId,
          localeId,
        }).deleteAll();
      }
    }
    const had = new Set(existing.map((t) => t.localeId));
    for (const { localeId, ...text } of translations) {
      if (had.has(localeId)) {
        await tx.orm.public.PostTranslation.where({
          postId,
          localeId,
        }).updateAll(text);
      } else {
        await tx.orm.public.PostTranslation.create({
          postId,
          localeId,
          ...text,
        });
      }
    }
  }

  // The post's tags, rewritten in its order (at most ten rows)
  private async setTaggings(tx: Tx, postId: bigint, tagIds: bigint[]) {
    await tx.orm.public.PostTagging.where({
      postId,
    }).deleteAll();
    for (const [position, tagId] of tagIds.entries()) {
      await tx.orm.public.PostTagging.create({
        postId,
        tagId,
        position,
      });
    }
  }

  // Move the subtree: drop links from old ancestors (keep those inside it),
  // then link every new ancestor to every node with depths added
  private async relink(tx: Tx, id: bigint, parentId: bigint | null) {
    await tx.execute(
      tx.raw.sql`DELETE FROM "public"."PostClosure"
        WHERE "descendantId" IN (
          SELECT "descendantId" FROM "public"."PostClosure" WHERE "ancestorId" = ${id})
        AND "ancestorId" NOT IN (
          SELECT "descendantId" FROM "public"."PostClosure" WHERE "ancestorId" = ${id})`
        .affectedCount()
        .build(),
    );
    if (parentId !== null) {
      await tx.execute(
        tx.raw
          .sql`INSERT INTO "public"."PostClosure" ("ancestorId", "descendantId", "depth")
          SELECT p."ancestorId", s."descendantId", p."depth" + s."depth" + 1
          FROM "public"."PostClosure" p
          CROSS JOIN "public"."PostClosure" s
          WHERE p."descendantId" = ${parentId} AND s."ancestorId" = ${id}`
          .affectedCount()
          .build(),
      );
    }
  }

  // fullSlug of every translation in the subtree: each ancestor's slug in
  // that locale (its translation's, else its own). NULL when one is missing
  // or the post is deleted, which frees the path.
  private async recomputeTranslationPaths(tx: Tx, id: bigint): Promise<void> {
    await tx.execute(
      tx.raw.sql`UPDATE "public"."PostTranslation" t SET "fullSlug" = sub."path"
        FROM (
          SELECT tr."id",
            CASE WHEN d."deletedAt" IS NULL THEN
              CASE WHEN bool_and(COALESCE(ta."slug", a."slug") IS NOT NULL)
              THEN string_agg(COALESCE(ta."slug", a."slug"), '/' ORDER BY chain."depth" DESC) END
            END AS "path"
          FROM "public"."PostClosure" n
          JOIN "public"."PostTranslation" tr ON tr."postId" = n."descendantId"
          JOIN "public"."Post" d ON d."id" = n."descendantId"
          JOIN "public"."PostClosure" chain ON chain."descendantId" = n."descendantId"
          JOIN "public"."Post" a ON a."id" = chain."ancestorId"
          LEFT JOIN "public"."PostTranslation" ta
            ON ta."postId" = a."id" AND ta."localeId" = tr."localeId"
          WHERE n."ancestorId" = ${id}
          GROUP BY tr."id", d."deletedAt"
        ) sub
        WHERE t."id" = sub."id" AND t."fullSlug" IS DISTINCT FROM sub."path"`
        .affectedCount()
        .build(),
    );
  }

  // fullSlug of the post and everything below it, rebuilt from each node's
  // whole ancestor chain: the slugs root-first, or NULL when any is missing.
  // Descendants are found through the closure table, never by prefix.
  private async recomputePaths(tx: Tx, id: bigint): Promise<void> {
    await tx.execute(
      tx.raw.sql`UPDATE "public"."Post" p SET "fullSlug" = sub."path"
        FROM (
          SELECT n."descendantId" AS "id",
            CASE WHEN bool_and(a."slug" IS NOT NULL)
              THEN string_agg(a."slug", '/' ORDER BY chain."depth" DESC)
            END AS "path"
          FROM "public"."PostClosure" n
          JOIN "public"."PostClosure" chain ON chain."descendantId" = n."descendantId"
          JOIN "public"."Post" a ON a."id" = chain."ancestorId"
          WHERE n."ancestorId" = ${id}
          GROUP BY n."descendantId"
        ) sub
        WHERE p."id" = sub."id" AND p."fullSlug" IS DISTINCT FROM sub."path"`
        .affectedCount()
        .build(),
    );
  }
}
