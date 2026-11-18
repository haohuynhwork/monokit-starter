// What each role may do, for the panel's permissions page (ideas/users
// "Roles"). The checks themselves stay where the rule belongs: controller
// guards (@Roles) and each context's domain. permissions.spec.ts runs those
// checks against this list, so the two can't drift apart.
export type BuiltInRoleKey = "admin" | "editor" | "author";

export interface Permission {
  key: string;
  group: string;
  label: string;
  // The built-in roles that have it; custom roles get theirs from the db
  roles: readonly BuiltInRoleKey[];
}

// Seeded as system roles (immutable); their grants are the `roles` lists
// below, re-applied at start-up (RoleSyncService)
export const ADMIN_ROLE_KEY = "admin";
export const DEFAULT_ROLE_KEY = "author";

export interface BuiltInRole {
  key: BuiltInRoleKey;
  name: string;
  description: string;
}

export const BUILT_IN_ROLES: readonly BuiltInRole[] = [
  {
    key: "admin",
    name: "Admin",
    description: "Everything, including users and settings",
  },
  {
    key: "editor",
    name: "Editor",
    description: "Publishes content and runs the shop",
  },
  {
    key: "author",
    name: "Author",
    description: "Writes their own posts and uploads files",
  },
];

export const ROLE_ORDER: readonly BuiltInRoleKey[] = BUILT_IN_ROLES.map(
  (r) => r.key,
);

export const PERMISSIONS: readonly Permission[] = [
  {
    key: "post:edit:own",
    group: "Posts",
    label: "Write and edit their own posts",
    roles: [
      "admin",
      "editor",
      "author",
    ],
  },
  {
    key: "post:edit:any",
    group: "Posts",
    label: "Edit and delete anyone's posts",
    roles: [
      "admin",
      "editor",
    ],
  },
  {
    key: "post:publish",
    group: "Posts",
    label: "Publish, schedule and unpublish",
    roles: [
      "admin",
      "editor",
    ],
  },
  {
    key: "asset:upload",
    group: "Media",
    label: "Upload files and manage their own",
    roles: [
      "admin",
      "editor",
      "author",
    ],
  },
  {
    key: "asset:manage:any",
    group: "Media",
    label: "Rename, move and delete anyone's files",
    roles: [
      "admin",
      "editor",
    ],
  },
  {
    key: "shop:manage",
    group: "Shop",
    label: "Manage products, categories and orders",
    roles: [
      "admin",
      "editor",
    ],
  },
  {
    key: "product:edit:any",
    group: "Shop",
    label: "Edit any product and its files (others: only their own)",
    roles: [
      "admin",
    ],
  },
  {
    key: "rating:delete:any",
    group: "Shop",
    label: "Remove customers' ratings",
    roles: [
      "admin",
    ],
  },
  {
    key: "contact:manage",
    group: "Contact",
    label: "Read and manage contact-form messages",
    roles: [
      "admin",
      "editor",
    ],
  },
  {
    key: "user:manage",
    group: "Users",
    label: "Create users, change roles, disable and delete",
    roles: [
      "admin",
    ],
  },
  {
    key: "settings:manage",
    group: "Settings",
    label: "Change site settings and outgoing email",
    roles: [
      "admin",
    ],
  },
  {
    key: "page:manage",
    group: "Pages",
    label: "Create, edit and delete pages and layouts",
    roles: [
      "admin",
      "editor",
    ],
  },
  {
    key: "geo:manage",
    group: "Regions",
    label: "Manage regions, locales and currencies",
    roles: [
      "admin",
      "editor",
    ],
  },
  {
    key: "audit:read",
    group: "Settings",
    label: "Read the activity log",
    roles: [
      "admin",
    ],
  },
];

// Every key: what a system actor (seeders, scripts) acts with
export const ADMIN_PERMISSIONS: ReadonlySet<string> = new Set(
  PERMISSIONS.map((p) => p.key),
);

// A built-in role's permissions, as the guard would resolve them
export function builtInPermissions(role: BuiltInRoleKey): ReadonlySet<string> {
  return new Set(
    PERMISSIONS.filter((p) => p.roles.includes(role)).map((p) => p.key),
  );
}
