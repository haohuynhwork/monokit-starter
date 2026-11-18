import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import {
  CONTACT_MESSAGE_STATUSES,
  type ContactMessageStatus,
} from "../../domain/contact-message.js";
import { CountContactMessagesQuery } from "./count-contact-messages.query.js";

@QueryHandler(CountContactMessagesQuery)
export class CountContactMessagesHandler
  implements IQueryHandler<CountContactMessagesQuery>
{
  constructor(@InjectDb() private readonly db: Db) {}

  async execute(): Promise<Record<ContactMessageStatus, number>> {
    const counts = await Promise.all(
      CONTACT_MESSAGE_STATUSES.map((status) =>
        this.db.orm.public.ContactMessage.where({
          status,
        })
          .where((m) => m.deletedAt.isNull())
          .aggregate((a) => ({
            count: a.count(),
          })),
      ),
    );
    return Object.fromEntries(
      CONTACT_MESSAGE_STATUSES.map((s, i) => [
        s,
        counts[i]!.count,
      ]),
    ) as Record<ContactMessageStatus, number>;
  }
}
