import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import {
  CONTACT_MESSAGE_VIEW_FIELDS,
  type ContactMessageDetail,
  toView,
} from "./contact-message.view.js";
import { GetContactMessageQuery } from "./get-contact-message.query.js";

@QueryHandler(GetContactMessageQuery)
export class GetContactMessageHandler
  implements IQueryHandler<GetContactMessageQuery>
{
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({
    id,
  }: GetContactMessageQuery): Promise<ContactMessageDetail | null> {
    const row = await this.db.orm.public.ContactMessage.where({
      id,
    })
      .where((m) => m.deletedAt.isNull())
      .select(...CONTACT_MESSAGE_VIEW_FIELDS, "ip", "userAgent")
      .first();
    return row ? toView(row) : null;
  }
}
