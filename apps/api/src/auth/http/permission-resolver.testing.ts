import {
  type BuiltInRoleKey,
  builtInPermissions,
  ROLE_ORDER,
} from "../../users/domain/permissions.js";

// For specs: built-in roles get their grants, any other key none
export const testPermissionResolver = {
  permissionsOf: (role: string): Promise<ReadonlySet<string>> =>
    Promise.resolve(
      ROLE_ORDER.includes(role as BuiltInRoleKey)
        ? builtInPermissions(role as BuiltInRoleKey)
        : new Set<string>(),
    ),
};
