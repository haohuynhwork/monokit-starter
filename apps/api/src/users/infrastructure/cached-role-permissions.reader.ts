import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import type { RolePermissionsReader } from "../domain/role-permissions.reader.js";

// A few seconds of staleness is fine (and covers a second api instance that
// can't be told to invalidate)
const TTL_MS = 30_000;

@Injectable()
export class CachedRolePermissionsReader implements RolePermissionsReader {
  private cache: Map<string, ReadonlySet<string>> | null = null;
  private loadedAt = 0;
  private loading: Promise<Map<string, ReadonlySet<string>>> | null = null;

  constructor(@InjectDb() private readonly db: Db) {}

  async permissionsOf(roleKey: string): Promise<ReadonlySet<string>> {
    const all = await this.load();
    return all.get(roleKey) ?? new Set();
  }

  invalidate(): void {
    this.cache = null;
  }

  private load(): Promise<Map<string, ReadonlySet<string>>> {
    if (this.cache && Date.now() - this.loadedAt < TTL_MS) {
      return Promise.resolve(this.cache);
    }
    this.loading ??= this.read()
      .then((all) => {
        this.cache = all;
        this.loadedAt = Date.now();
        return all;
      })
      .finally(() => {
        this.loading = null;
      });
    return this.loading;
  }

  private async read(): Promise<Map<string, ReadonlySet<string>>> {
    const [roles, permissions, grants] = await Promise.all([
      this.db.orm.public.Role.select("id", "key")
        .where((r) => r.deletedAt.isNull())
        .all(),
      this.db.orm.public.Permission.select("id", "key").all(),
      this.db.orm.public.RolePermission.select("roleId", "permissionId").all(),
    ]);
    const permissionKeys = new Map(
      permissions.map((p) => [
        p.id,
        p.key,
      ]),
    );
    const result = new Map<string, Set<string>>(
      roles.map((r) => [
        r.key,
        new Set(),
      ]),
    );
    const roleKeys = new Map(
      roles.map((r) => [
        r.id,
        r.key,
      ]),
    );
    for (const grant of grants) {
      const role = roleKeys.get(grant.roleId);
      const permission = permissionKeys.get(grant.permissionId);
      if (role && permission) {
        result.get(role)?.add(permission);
      }
    }
    return result;
  }
}
