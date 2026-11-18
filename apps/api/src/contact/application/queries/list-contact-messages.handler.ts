import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { CONTACT_MESSAGE_VIEW_FIELDS, toView } from "./contact-message.view.js";
import {
  type ContactMessagePage,
  ListContactMessagesQuery,
} from "./list-contact-messages.query.js";

@QueryHandler(ListContactMessagesQuery)
export class ListContactMessagesHandler
  implements IQueryHandler<ListContactMessagesQuery>
{
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({
    status,
    limit,
    offset,
  }: ListContactMessagesQuery): Promise<ContactMessagePage> {
    const messages = this.db.orm.public.ContactMessage.where((m) =>
      m.deletedAt.isNull(),
    ).where((m) => (status ? m.status.eq(status) : m.id.isNotNull()));
    const [rows, { total }] = await Promise.all([
      messages
        .select(...CONTACT_MESSAGE_VIEW_FIELDS)
        .orderBy((m) => m.id.desc())
        .limit(limit)
        .offset(offset)
        .all(),
      messages.aggregate((a) => ({
        total: a.count(),
      })),
    ]);
    return {
      items: rows.map(toView),
      total,
    };
  }
}
