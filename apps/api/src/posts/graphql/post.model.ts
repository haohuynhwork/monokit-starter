import { Field, Int, ObjectType } from "@nestjs/graphql";
import { PaginatedType } from "../../common/graphql/paginated.js";

// GraphQL shapes of the public post views (application/queries/post.view.ts).
// Types are spelled out in @Field: the test runner emits no decorator metadata.

@ObjectType("TagRef", {
  description: "A tag as shown on a post",
})
export class TagRefModel {
  @Field(() => String)
  name!: string;

  @Field(() => String, {
    description: "Its page is /tags/<slug>",
  })
  slug!: string;
}

@ObjectType("PostAlternate", {
  description: "Another language version of a post",
})
export class PostAlternateModel {
  @Field(() => String)
  locale!: string;

  @Field(() => String)
  path!: string;
}

@ObjectType("Post", {
  description: "A live post, as the website shows it",
})
export class PostModel {
  @Field(() => String)
  title!: string;

  @Field(() => String, {
    description: "Full path on the site",
  })
  path!: string;

  @Field(() => String, {
    description: "Sanitized HTML; empty in lists (use post(path:))",
  })
  content!: string;

  @Field(() => String, {
    nullable: true,
  })
  description!: string | null;

  @Field(() => [
    TagRefModel,
  ])
  tags!: TagRefModel[];

  @Field(() => String, {
    description: "ISO 8601 timestamp",
  })
  publishedAt!: string;

  @Field(() => String, {
    nullable: true,
    description: "Ready-to-use URL",
  })
  coverUrl!: string | null;

  @Field(() => String, {
    description:
      "Locale of this text: the requested one, or the default when the post has no translation in it",
  })
  locale!: string;

  @Field(
    () => [
      PostAlternateModel,
    ],
    {
      nullable: true,
      description: "Every locale's path, the default first (post(path:) only)",
    },
  )
  alternates?: PostAlternateModel[];
}

export const PostPage = PaginatedType(PostModel, "PostPage");

@ObjectType("PostTag", {
  description: "A tag with live posts",
})
export class PostTagModel {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => Int, {
    description: "Live posts with this tag",
  })
  postCount!: number;
}
