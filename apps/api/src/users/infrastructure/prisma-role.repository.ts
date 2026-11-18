import { Inject, Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import type { AuditEntry } from "../../common/domain/audit-entry.js";
import {
  AUDIT_WRITER,
  type AuditWriter,
} from "../../common/infrastructure/audit-writer.js";
import { RoleKeyTakenError } from "../domain/role.errors.js";
import { Role } from "../domain/role.js";
import type { RoleRepository } from "../domain/role.repository.js";
import {
  ROLE_PERMISSIONS_READER,
  type RolePermissionsReader,
} from "../domain/role-permissions.reader.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

@Injectable()
export class PrismaRoleRepository implements RoleRepository {
  constructor(
    @InjectDb() private readonly db: Db,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
    @Inject(ROLE_PERMISSIONS_READER)
    private readonly reader: RolePermissionsReader,
  ) {}

  async findById(id: bigint): Promise<Role | null> {
    const row = await this.db.orm.public.Role.where({
      id,
    })
      .where((r) => r.deletedAt.isNull())
      .first();
    if (!row) {
      return null;
    }
    const grants = await this.db.orm.public.RolePermission.select(
      "permissionId",
    )
      .where({
        roleId: id,
      })
      .all();
    const permissions = grants.length
      ? await this.db.orm.public.Permission.select("key")
          .where((p) => p.id.in(grants.map((g) => g.permissionId)))
          .all()
      : [];
    return Role.restore({
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description,
      system: row.system,
      permissions: permissions.map((p) => p.key),
      deletedAt: row.deletedAt,
    });
  }

  async countUsers(roleId: bigint): Promise<number> {
    const { count } = await this.db.orm.public.User.where({
      roleId,
    })
      .where((u) => u.deletedAt.isNull())
      .aggregate((a) => ({
        count: a.count(),
      }));
    return count;
  }

  async save(role: Role, audit?: (role: Role) => AuditEntry): Promise<void> {
    try {
      await this.db.transaction(async (tx) => {
        const { id, permissions, ...props } = role.snapshot();
        let roleId = id;
        if (roleId === null) {
          const row = await tx.orm.public.Role.select("id").create(props);
          roleId = row.id;
          role.assignId(roleId);
        } else {
          await tx.orm.public.Role.where({
            id: roleId,
          }).update(props);
        }
        await this.setPermissions(tx, roleId, permissions);
        if (audit) {
          await this.audit.record(tx, audit(role));
        }
      });
    } catch (error) {
      if (isKeyUniqueViolation(error)) {
        throw new RoleKeyTakenError();
      }
      throw error;
    }
    this.reader.invalidate();
  }

  private async setPermissions(
    tx: Tx,
    roleId: bigint,
    keys: readonly string[],
  ): Promise<void> {
    await tx.orm.public.RolePermission.where({
      roleId,
    }).deleteAll();
    if (keys.length === 0) {
      return;
    }
    const rows = await tx.orm.public.Permission.select("id")
      .where((p) =>
        p.key.in([
          ...keys,
        ]),
      )
      .all();
    for (const { id: permissionId } of rows) {
      await tx.orm.public.RolePermission.create({
        roleId,
        permissionId,
      });
    }
  }
}

function isKeyUniqueViolation(error: unknown): boolean {
  type SqlError = {
    sqlState?: string;
    constraint?: string;
    cause?: unknown;
  };
  for (let e = error as SqlError | undefined; e; e = e.cause as SqlError) {
    if (e.sqlState === "23505" && e.constraint === "roles_key_unique") {
      return true;
    }
  }
  return false;
}
