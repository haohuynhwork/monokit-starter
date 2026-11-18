import { Query } from "@nestjs/cqrs";

export interface FolderOption {
  id: string;
  name: string;
  path: string;
}

// Every folder, for "move to" pickers; ordered by path
export class ListFoldersQuery extends Query<FolderOption[]> {}
