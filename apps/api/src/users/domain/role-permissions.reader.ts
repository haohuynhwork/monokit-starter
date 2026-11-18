// What a role key may do, for guards and domain checks. Cached: it runs on
// every request, so a role edit applies within the cache's lifetime.
export interface RolePermissionsReader {
  // Empty for an unknown or deleted role (no access, never a default role)
  permissionsOf(roleKey: string): Promise<ReadonlySet<string>>;
  // Called after a role or its permissions change
  invalidate(): void;
}

export const ROLE_PERMISSIONS_READER = Symbol("ROLE_PERMISSIONS_READER");
