import { Inject, Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import { not } from "@prisma/orm-postgres/orm-client";
import type { AuditEntry } from "../../common/domain/audit-entry.js";
import {
  AUDIT_WRITER,
  type AuditWriter,
} from "../../common/infrastructure/audit-writer.js";
import { Email } from "../domain/email.js";
import { ADMIN_ROLE_KEY } from "../domain/permissions.js";
import type { Phone } from "../domain/phone.js";
import { EmailTakenError, RoleNotFoundError } from "../domain/user.errors.js";
import { PASSWORD_PROVIDER, User } from "../domain/user.js";
import type { UserRepository } from "../domain/user.repository.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(
    @InjectDb() private readonly db: Db,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
  ) {}

  async findById(id: bigint): Promise<User | null> {
    const row = await this.users()
      .where((u) => u.id.eq(id))
      .where((u) => u.deletedAt.isNull())
      .first();
    return row ? toDomain(row) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    // Case-insensitive equality: ILIKE with its wildcards escaped
    const pattern = email.value.replace(/[\\%_]/g, "\\$&");
    const row = await this.users()
      .where((u) => u.email.ilike(pattern))
      .where((u) => u.deletedAt.isNull())
      .first();
    return row ? toDomain(row) : null;
  }

  async countActiveAdmins(): Promise<number> {
    const admin = await this.db.orm.public.Role.where({
      key: ADMIN_ROLE_KEY,
    })
      .where((r) => r.deletedAt.isNull())
      .first();
    if (!admin) {
      return 0;
    }
    const { count } = await this.db.orm.public.User.where({
      roleId: admin.id,
      status: "active",
    })
      .where((u) => u.deletedAt.isNull())
      .aggregate((a) => ({
        count: a.count(),
      }));
    return count;
  }

  async save(user: User, audit?: AuditEntry): Promise<void> {
    try {
      await this.db.transaction(async (tx) => {
        await (user.id === null
          ? this.insert(tx, user)
          : this.update(tx, user));
        if (audit) {
          await this.audit.record(tx, audit);
        }
      });
    } catch (error) {
      if (isEmailUniqueViolation(error)) {
        throw new EmailTakenError();
      }
      throw error;
    }
  }

  private async insert(tx: Tx, user: User): Promise<void> {
    const { identities, id: _, email, phone, role, ...props } = user.snapshot();
    const row = await tx.orm.public.User.select("id").create({
      ...props,
      roleId: await this.roleId(tx, role),
      ...phoneColumns(phone),
      email: email.value,
    });
    user.assignId(row.id);
    for (const identity of identities) {
      await tx.orm.public.UserIdentity.create({
        userId: row.id,
        provider: identity.provider,
        providerUserId:
          identity.providerUserId ??
          (identity.provider === PASSWORD_PROVIDER ? String(row.id) : ""),
        passwordHash: identity.passwordHash,
      });
    }
  }

  private async update(tx: Tx, user: User): Promise<void> {
    const { identities, id, email, phone, role, ...props } = user.snapshot();
    const userId = id!;
    await tx.orm.public.User.where({
      id: userId,
    }).update({
      ...props,
      roleId: await this.roleId(tx, role),
      ...phoneColumns(phone),
      email: email.value,
    });

    // Identities the aggregate dropped, then new or changed ones
    const keep = identities.flatMap((i) =>
      i.id === null
        ? []
        : [
            i.id,
          ],
    );
    await tx.orm.public.UserIdentity.where({
      userId,
    })
      .where((i) => (keep.length ? not(i.id.in(keep)) : i.id.isNotNull()))
      .deleteAll();
    for (const identity of identities) {
      if (identity.id === null) {
        await tx.orm.public.UserIdentity.create({
          userId,
          provider: identity.provider,
          providerUserId: identity.providerUserId ?? String(userId),
          passwordHash: identity.passwordHash,
        });
      } else {
        await tx.orm.public.UserIdentity.where({
          id: identity.id,
        }).update({
          passwordHash: identity.passwordHash,
        });
      }
    }
  }

  // The live role row for a key; a deleted or unknown key can't be assigned
  private async roleId(tx: Tx, key: string): Promise<bigint> {
    const row = await tx.orm.public.Role.where({
      key,
    })
      .where((r) => r.deletedAt.isNull())
      .first();
    if (!row) {
      throw new RoleNotFoundError();
    }
    return row.id;
  }

  private users() {
    return this.db.orm.public.User.include("identities").include("role");
  }
}

type UserRow = NonNullable<
  Awaited<ReturnType<ReturnType<PrismaUserRepository["users"]>["first"]>>
>;

function toDomain(row: UserRow): User {
  return User.restore({
    id: row.id,
    email: Email.fromStored(row.email),
    emailVerifiedAt: row.emailVerifiedAt,
    displayName: row.displayName,
    shortName: row.shortName,
    givenName: row.givenName,
    familyName: row.familyName,
    phone:
      row.phoneCountry !== null && row.phoneNumber !== null
        ? {
            country: row.phoneCountry,
            number: row.phoneNumber,
          }
        : null,
    status: row.status,
    role: row.role.key,
    deletedAt: row.deletedAt,
    identities: row.identities.map((i) => ({
      id: i.id,
      provider: i.provider,
      providerUserId: i.providerUserId,
      passwordHash: i.passwordHash,
    })),
  });
}

function phoneColumns(phone: Phone | null) {
  return {
    phoneCountry: phone?.country ?? null,
    phoneNumber: phone?.number ?? null,
  };
}

function isEmailUniqueViolation(error: unknown): boolean {
  type SqlError = {
    sqlState?: string;
    constraint?: string;
    cause?: unknown;
  };
  for (let e = error as SqlError | undefined; e; e = e.cause as SqlError) {
    if (e.sqlState === "23505" && e.constraint === "users_email_unique") {
      return true;
    }
  }
  return false;
}
