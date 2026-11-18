import type { AuditEntry } from "../../common/domain/audit-entry.js";
import type { Role } from "./role.js";

export interface RoleRepository {
  // Non-deleted only
  findById(id: bigint): Promise<Role | null>;
  // Non-deleted users who have the role
  countUsers(roleId: bigint): Promise<number>;
  // Inserts (assigning the id) or updates; a taken key throws
  // RoleKeyTakenError. `audit` builds the entry once the id is known and is
  // written in the same transaction.
  save(role: Role, audit?: (role: Role) => AuditEntry): Promise<void>;
}

export const ROLE_REPOSITORY = Symbol("ROLE_REPOSITORY");
