import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import { sqlError } from "../../common/infrastructure/sql-error.js";
import { Currency, checkRate } from "../domain/currency.js";
import { CurrencyCodeTakenError } from "../domain/geo.errors.js";
import type { CurrencyRepository } from "../domain/locale.repository.js";

const FIELDS = [
  "id",
  "code",
  "name",
  "symbol",
  "decimals",
  "rate",
  "rateAt",
  "active",
  "position",
] as const;

@Injectable()
export class PrismaCurrencyRepository implements CurrencyRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async findById(id: bigint): Promise<Currency | null> {
    const row = await this.db.orm.public.Currency.select(...FIELDS)
      .where({
        id,
      })
      .first();
    return row
      ? Currency.restore({
          ...row,
          rate: checkRate(String(row.rate)),
        })
      : null;
  }

  async save(currency: Currency): Promise<void> {
    const { id, ...props } = currency.snapshot();
    try {
      if (id === null) {
        const row =
          await this.db.orm.public.Currency.select("id").create(props);
        currency.assignId(row.id);
      } else {
        await this.db.orm.public.Currency.where({
          id,
        }).update(props);
      }
    } catch (error) {
      if (sqlError(error)?.sqlState === "23505") {
        throw new CurrencyCodeTakenError();
      }
      throw error;
    }
  }

  async delete(id: bigint): Promise<void> {
    await this.db.orm.public.Currency.where({
      id,
    }).deleteAll();
  }
}
