import { Query } from "@nestjs/cqrs";
import type { UserRole } from "../../domain/user.js";

export interface PermissionsView {
  // Role keys: built-in first, then custom ones
  roles: UserRole[];
  permissions: {
    key: string;
    group: string;
    label: string;
    // Keys of the roles that have it
    roles: UserRole[];
  }[];
}

// The role matrix, for the panel's permissions page
export class ListPermissionsQuery extends Query<PermissionsView> {}
