import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import { sqlError } from "../../common/infrastructure/sql-error.js";
import { LocaleCodeTakenError } from "../domain/geo.errors.js";
import { Locale } from "../domain/locale.js";
import type { LocaleRepository } from "../domain/locale.repository.js";

const FIELDS = [
  "id",
  "code",
  "name",
  "nativeName",
  "rtl",
  "active",
  "isDefault",
  "position",
] as const;

@Injectable()
export class PrismaLocaleRepository implements LocaleRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async findById(id: bigint): Promise<Locale | null> {
    const row = await this.db.orm.public.Locale.select(...FIELDS)
      .where({
        id,
      })
      .first();
    return row ? Locale.restore(row) : null;
  }

  async hasAny(): Promise<boolean> {
    return (await this.db.orm.public.Locale.select("id").first()) !== null;
  }

  async save(locale: Locale): Promise<void> {
    const { id, ...props } = locale.snapshot();
    try {
      await this.db.transaction(async (tx) => {
        // Clear the old default first: locales_one_default allows one
        if (props.isDefault) {
          await tx.orm.public.Locale.where({
            isDefault: true,
          })
            .where((l) => (id === null ? l.id.isNotNull() : l.id.neq(id)))
            .updateAndCount({
              isDefault: false,
            });
        }
        if (id === null) {
          const row = await tx.orm.public.Locale.select("id").create(props);
          locale.assignId(row.id);
        } else {
          await tx.orm.public.Locale.where({
            id,
          }).updateAndCount(props);
        }
      });
    } catch (error) {
      if (sqlError(error)?.sqlState === "23505") {
        throw new LocaleCodeTakenError();
      }
      throw error;
    }
  }

  async delete(id: bigint): Promise<void> {
    await this.db.orm.public.Locale.where({
      id,
    }).deleteAll();
  }
}
