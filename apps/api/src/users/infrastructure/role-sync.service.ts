import { Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import { BUILT_IN_ROLES, PERMISSIONS } from "../domain/permissions.js";
import {
  ROLE_PERMISSIONS_READER,
  type RolePermissionsReader,
} from "../domain/role-permissions.reader.js";

// Makes the tables match the code at start-up: the permission catalog, the
// built-in roles and their grants (code owns those; custom roles are the
// db's). Idempotent, so every instance may run it.
@Injectable()
export class RoleSyncService implements OnModuleInit {
  private readonly log = new Logger(RoleSyncService.name);

  constructor(
    @InjectDb() private readonly db: Db,
    @Inject(ROLE_PERMISSIONS_READER)
    private readonly reader: RolePermissionsReader,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.sync();
  }

  async sync(): Promise<void> {
    await this.db.transaction(async (tx) => {
      const permissionIds = new Map<string, bigint>();
      for (const p of PERMISSIONS) {
        const existing = await tx.orm.public.Permission.where({
          key: p.key,
        }).first();
        if (existing) {
          await tx.orm.public.Permission.where({
            id: existing.id,
          }).update({
            group: p.group,
            label: p.label,
          });
          permissionIds.set(p.key, existing.id);
        } else {
          const row = await tx.orm.public.Permission.select("id").create({
            key: p.key,
            group: p.group,
            label: p.label,
          });
          permissionIds.set(p.key, row.id);
        }
      }
      // A permission that left the catalog goes, with its grants (cascade)
      const known = [
        ...permissionIds.keys(),
      ];
      await tx.orm.public.Permission.where((p) =>
        p.key.notIn(known),
      ).deleteAll();

      for (const role of BUILT_IN_ROLES) {
        const existing = await tx.orm.public.Role.where({
          key: role.key,
        })
          .where((r) => r.deletedAt.isNull())
          .first();
        let roleId: bigint;
        if (existing) {
          roleId = existing.id;
          await tx.orm.public.Role.where({
            id: roleId,
          }).update({
            name: role.name,
            description: role.description,
            system: true,
          });
        } else {
          const row = await tx.orm.public.Role.select("id").create({
            key: role.key,
            name: role.name,
            description: role.description,
            system: true,
          });
          roleId = row.id;
        }
        // Grants follow the code exactly
        await tx.orm.public.RolePermission.where({
          roleId,
        }).deleteAll();
        for (const p of PERMISSIONS) {
          if (p.roles.includes(role.key)) {
            await tx.orm.public.RolePermission.create({
              roleId,
              permissionId: permissionIds.get(p.key)!,
            });
          }
        }
      }
    });
    this.reader.invalidate();
    this.log.log("Roles and permissions synced");
  }
}
