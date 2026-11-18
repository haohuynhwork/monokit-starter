import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import type {
  ContactMessageStatus,
  NewContactMessage,
} from "../domain/contact-message.js";
import type { ContactMessageRepository } from "../domain/contact-message.repository.js";

@Injectable()
export class PrismaContactMessageRepository
  implements ContactMessageRepository
{
  constructor(@InjectDb() private readonly db: Db) {}

  async create(m: NewContactMessage): Promise<bigint> {
    const { fields } = m;
    const row = await this.db.orm.public.ContactMessage.select("id").create({
      name: fields.name ?? null,
      email: fields.email ?? null,
      phone: fields.phone ?? null,
      subject: fields.subject ?? null,
      message: fields.message ?? null,
      messageFormat: m.messageFormat ?? "text",
      ...(m.status && {
        status: m.status,
      }),
      ip: m.ip?.slice(0, 45) ?? null,
      userAgent: m.userAgent?.slice(0, 512) ?? null,
    });
    return row.id;
  }

  async markMailed(id: bigint): Promise<void> {
    await this.db.orm.public.ContactMessage.where({
      id,
    }).update({
      mailedAt: new Date().toISOString(),
    });
  }

  async findStatus(id: bigint): Promise<ContactMessageStatus | null> {
    const row = await this.live(id).select("status").first();
    return row?.status ?? null;
  }

  async changeStatus(
    id: bigint,
    status: ContactMessageStatus,
  ): Promise<boolean> {
    const row = await this.live(id).select("id").update({
      status,
    });
    return row !== null;
  }

  async delete(id: bigint): Promise<boolean> {
    const row = await this.live(id).select("id").update({
      deletedAt: new Date().toISOString(),
    });
    return row !== null;
  }

  private live(id: bigint) {
    return this.db.orm.public.ContactMessage.where({
      id,
    }).where((m) => m.deletedAt.isNull());
  }
}
