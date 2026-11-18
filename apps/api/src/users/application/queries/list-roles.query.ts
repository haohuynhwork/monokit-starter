import { Query } from "@nestjs/cqrs";

export interface RoleView {
  id: string;
  key: string;
  name: string;
  description: string | null;
  system: boolean;
  permissions: string[];
  // Non-deleted users who have it
  users: number;
}

// Built-in roles first, then custom ones by name
export class ListRolesQuery extends Query<RoleView[]> {}
