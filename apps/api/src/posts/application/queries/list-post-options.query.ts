import { Query } from "@nestjs/cqrs";

export interface PostOption {
  id: string;
  title: string;
  path: string | null;
}

// Every post, for parent pickers; by path, then title
export class ListPostOptionsQuery extends Query<PostOption[]> {}
