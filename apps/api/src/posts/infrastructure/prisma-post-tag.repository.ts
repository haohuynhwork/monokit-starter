import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import { sqlError } from "../../common/infrastructure/sql-error.js";
import { PostTagTakenError } from "../domain/post.errors.js";
import { PostTag } from "../domain/post-tag.js";
import type { PostTagRepository } from "../domain/post-tag.repository.js";

@Injectable()
export class PrismaPostTagRepository implements PostTagRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async findById(id: bigint): Promise<PostTag | null> {
    const row = await this.db.orm.public.PostTag.select("id", "name", "slug")
      .where({
        id,
      })
      .first();
    return row ? PostTag.restore(row) : null;
  }

  async findIdsBySlugs(slugs: string[]): Promise<Map<string, bigint>> {
    if (!slugs.length) {
      return new Map();
    }
    const rows = await this.db.orm.public.PostTag.select("id", "slug")
      .where((t) => t.slug.in(slugs))
      .all();
    return new Map(
      rows.map((r) => [
        r.slug,
        r.id,
      ]),
    );
  }

  async ensure(
    tags: {
      name: string;
      slug: string;
    }[],
  ): Promise<Map<string, bigint>> {
    await this.db.transaction(async (tx) => {
      for (const { name, slug } of tags) {
        // Another editor may add the same tag at the same moment
        await tx.execute(
          tx.raw.sql`INSERT INTO "public"."PostTag" ("name", "slug")
            VALUES (${name}, ${slug}) ON CONFLICT ("slug") DO NOTHING`
            .affectedCount()
            .build(),
        );
      }
    });
    return this.findIdsBySlugs(tags.map((t) => t.slug));
  }

  async save(tag: PostTag): Promise<void> {
    const { id, name, slug } = tag.snapshot();
    try {
      await this.db.orm.public.PostTag.where({
        id: id!,
      }).update({
        name,
        slug,
      });
    } catch (error) {
      // post_tags_slug_unique
      if (sqlError(error)?.sqlState === "23505") {
        throw new PostTagTakenError();
      }
      throw error;
    }
  }

  async delete(id: bigint): Promise<void> {
    await this.db.orm.public.PostTag.where({
      id,
    }).deleteAll();
  }
}
