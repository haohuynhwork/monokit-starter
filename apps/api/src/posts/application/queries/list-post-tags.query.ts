import { Query } from "@nestjs/cqrs";

export interface PostTagView {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

// By name. `live`: count only posts on the site and leave out tags without
// any (the public list); otherwise every non-deleted post counts (the panel).
// `q` matches names, for autocomplete.
export class ListPostTagsQuery extends Query<PostTagView[]> {
  constructor(
    readonly filter: {
      live: boolean;
      q?: string;
    },
  ) {
    super();
  }
}
