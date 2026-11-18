import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import { sqlError } from "../../common/infrastructure/sql-error.js";
import { PageLayoutNameTakenError } from "../domain/page.errors.js";
import { checkLayoutSettings, PageLayout } from "../domain/page-layout.js";
import type { PageLayoutRepository } from "../domain/page-layout.repository.js";

const FIELDS = [
  "id",
  "name",
  "settings",
  "isDefault",
  "deletedAt",
] as const;

type Row = {
  id: bigint;
  name: string;
  settings: unknown;
  isDefault: boolean;
  deletedAt: string | null;
};

const toLayout = (row: Row) =>
  PageLayout.restore({
    ...row,
    settings: checkLayoutSettings(row.settings),
  });

@Injectable()
export class PrismaPageLayoutRepository implements PageLayoutRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async findById(id: bigint): Promise<PageLayout | null> {
    const row = await this.db.orm.public.PageLayout.select(...FIELDS)
      .where({
        id,
      })
      .where((l) => l.deletedAt.isNull())
      .first();
    return row ? toLayout(row) : null;
  }

  async findDefault(): Promise<PageLayout | null> {
    const row = await this.db.orm.public.PageLayout.select(...FIELDS)
      .where({
        isDefault: true,
      })
      .first();
    return row ? toLayout(row) : null;
  }

  async save(layout: PageLayout): Promise<void> {
    const { id, ...props } = layout.snapshot();
    const data = {
      ...props,
      settings: props.settings as never,
    };
    try {
      await this.db.transaction(async (tx) => {
        // page_layouts_one_default: free the slot first
        if (props.isDefault) {
          await tx.execute(
            tx.raw.sql`UPDATE "public"."PageLayout" SET "isDefault" = false
              WHERE "isDefault" AND "id" <> ${id ?? 0n}`
              .affectedCount()
              .build(),
          );
        }
        if (id === null) {
          const row = await tx.orm.public.PageLayout.select("id").create(data);
          layout.assignId(row.id);
        } else {
          await tx.orm.public.PageLayout.where({
            id,
          }).update(data);
        }
      });
    } catch (error) {
      const e = sqlError(error);
      if (
        e?.sqlState === "23505" &&
        e.constraint?.startsWith("page_layouts_name_unique")
      ) {
        throw new PageLayoutNameTakenError();
      }
      throw error;
    }
  }

  async isUsed(layoutId: bigint): Promise<boolean> {
    const row = await this.db.orm.public.Page.select("id")
      .where({
        layoutId,
      })
      .where((p) => p.deletedAt.isNull())
      .first();
    return row !== null;
  }
}
