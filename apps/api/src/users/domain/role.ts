import { BUILT_IN_ROLES, PERMISSIONS } from "./permissions.js";
import {
  InvalidRoleError,
  RoleInUseError,
  RoleKeyTakenError,
  SystemRoleError,
  UnknownPermissionError,
} from "./role.errors.js";

export interface RoleProps {
  id: bigint | null;
  // Lowercase handle: 'moderator'
  key: string;
  name: string;
  description: string | null;
  // Built-in roles are seeded by the api and immutable
  system: boolean;
  // Keys from the code catalog (permissions.ts)
  permissions: string[];
  deletedAt: string | null;
}

const KEY = /^[a-z][a-z0-9_-]{1,49}$/;
const KNOWN = new Set(PERMISSIONS.map((p) => p.key));
const BUILT_IN_KEYS = new Set<string>(BUILT_IN_ROLES.map((r) => r.key));

// A custom role (ideas/users "Roles"): a named set of permissions
export class Role {
  private constructor(private props: RoleProps) {}

  static create(input: {
    key: string;
    name: string;
    description?: string | null;
    permissions: readonly string[];
  }): Role {
    const key = input.key.trim().toLowerCase();
    if (!KEY.test(key)) {
      throw new InvalidRoleError(
        "Key: 2-50 lowercase letters, digits, - or _, starting with a letter",
      );
    }
    // Built-in keys are reserved even before their rows exist
    if (BUILT_IN_KEYS.has(key)) {
      throw new RoleKeyTakenError();
    }
    return new Role({
      id: null,
      key,
      name: checkName(input.name),
      description: input.description?.trim() || null,
      system: false,
      permissions: checkPermissions(input.permissions),
      deletedAt: null,
    });
  }

  static restore(props: RoleProps): Role {
    return new Role(props);
  }

  get id(): bigint | null {
    return this.props.id;
  }
  get key(): string {
    return this.props.key;
  }
  get isSystem(): boolean {
    return this.props.system;
  }

  snapshot(): Readonly<RoleProps> {
    return this.props;
  }

  assignId(id: bigint): void {
    this.props.id = id;
  }

  update(input: {
    name?: string;
    description?: string | null;
    permissions?: readonly string[];
  }): void {
    this.assertCustom();
    if (input.name !== undefined) {
      this.props.name = checkName(input.name);
    }
    if (input.description !== undefined) {
      this.props.description = input.description?.trim() || null;
    }
    if (input.permissions !== undefined) {
      this.props.permissions = checkPermissions(input.permissions);
    }
  }

  // `users`: how many (non-deleted) users have it
  delete(users: number, now: string): void {
    this.assertCustom();
    if (users > 0) {
      throw new RoleInUseError();
    }
    this.props.deletedAt = now;
  }

  private assertCustom(): void {
    if (this.props.system) {
      throw new SystemRoleError();
    }
  }
}

function checkName(name: string): string {
  const clean = name.trim();
  if (clean.length < 1 || clean.length > 100) {
    throw new InvalidRoleError("Name: 1-100 characters");
  }
  return clean;
}

function checkPermissions(keys: readonly string[]): string[] {
  for (const key of keys) {
    if (!KNOWN.has(key)) {
      throw new UnknownPermissionError(key);
    }
  }
  return [
    ...new Set(keys),
  ];
}
