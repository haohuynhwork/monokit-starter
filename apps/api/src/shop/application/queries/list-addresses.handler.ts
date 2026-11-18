import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { ListAddressesQuery } from "./list-addresses.query.js";
import type { AddressView } from "./shop.view.js";

@QueryHandler(ListAddressesQuery)
export class ListAddressesHandler implements IQueryHandler<ListAddressesQuery> {
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({ userId }: ListAddressesQuery): Promise<AddressView[]> {
    const rows = await this.db.orm.public.Address.select(
      "id",
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
    )
      .where({
        userId,
      })
      .where((a) => a.deletedAt.isNull())
      .orderBy((a) => a.id.asc())
      .limit(100)
      .all();
    // Booleans can't be ordered in the ORM; few rows, so sort here
    return rows
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
      .map((r) => ({
        ...r,
        id: String(r.id),
      }));
  }
}
