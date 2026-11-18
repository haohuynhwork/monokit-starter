import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import { Address } from "../domain/address.js";
import type { AddressRepository } from "../domain/shop.repository.js";

const ADDRESS_FIELDS = [
  "id",
  "userId",
  "label",
  "recipientName",
  "phone",
  "line1",
  "line2",
  "city",
  "regionCode",
  "region",
  "postalCode",
  "countryCode",
  "isDefault",
  "deletedAt",
] as const;

@Injectable()
export class PrismaAddressRepository implements AddressRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async findById(id: bigint): Promise<Address | null> {
    const row = await this.db.orm.public.Address.select(...ADDRESS_FIELDS)
      .where({
        id,
      })
      .where((a) => a.deletedAt.isNull())
      .first();
    return row ? Address.restore(row) : null;
  }

  async hasAny(userId: bigint): Promise<boolean> {
    const row = await this.db.orm.public.Address.select("id")
      .where({
        userId,
      })
      .where((a) => a.deletedAt.isNull())
      .first();
    return row !== null;
  }

  async save(address: Address): Promise<void> {
    const { id, ...props } = address.snapshot();
    await this.db.transaction(async (tx) => {
      // Clear the old default first: addresses_one_default allows one
      if (props.isDefault) {
        await tx.orm.public.Address.where({
          userId: props.userId,
          isDefault: true,
        })
          .where((a) => (id === null ? a.id.isNotNull() : a.id.neq(id)))
          .updateAndCount({
            isDefault: false,
          });
      }
      if (id === null) {
        const row = await tx.orm.public.Address.select("id").create(props);
        address.assignId(row.id);
      } else {
        await tx.orm.public.Address.where({
          id,
        }).update(props);
      }
    });
  }
}
