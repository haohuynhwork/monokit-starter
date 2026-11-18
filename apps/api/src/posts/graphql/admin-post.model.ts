import { Field, ID, InputType, Int, ObjectType } from "@nestjs/graphql";
import { PaginatedType } from "../../common/graphql/paginated.js";
import { TagRefModel } from "./post.model.js";

// GraphQL shapes of the panel's post views (application/queries/post.view.ts)
// and the inputs of its writes (http/posts.dto.ts validates them).

@ObjectType("PostCover")
export class PostCoverModel {
  @Field(() => ID)
  assetId!: string;

  @Field(() => String, {
    nullable: true,
    description: "Ready-to-use URL",
  })
  url!: string | null;
}

@ObjectType("AdminPostTranslation", {
  description: "A post's text in a non-default locale",
})
export class AdminPostTranslationModel {
  @Field(() => String)
  locale!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String, {
    nullable: true,
    description: "null: the post's own slug",
  })
  slug!: string | null;

  @Field(() => String, {
    nullable: true,
    description: "Path in this locale; null when not reachable",
  })
  path!: string | null;

  @Field(() => String)
  content!: string;

  @Field(() => String, {
    nullable: true,
  })
  description!: string | null;

  @Field(() => String)
  updatedAt!: string;
}

@ObjectType("AdminPostSummary", {
  description: "A post in the panel's list",
})
export class AdminPostSummaryModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, {
    nullable: true,
  })
  parentId!: string | null;

  @Field(() => ID, {
    nullable: true,
  })
  authorId!: string | null;

  @Field(() => String)
  title!: string;

  @Field(() => String, {
    nullable: true,
  })
  slug!: string | null;

  @Field(() => String, {
    nullable: true,
    description: "null: not reachable yet",
  })
  path!: string | null;

  @Field(() => String, {
    nullable: true,
  })
  description!: string | null;

  @Field(() => [
    TagRefModel,
  ])
  tags!: TagRefModel[];

  @Field(() => String, {
    description: "draft, scheduled or published",
  })
  status!: string;

  @Field(() => String, {
    nullable: true,
  })
  publishedAt!: string | null;

  @Field(() => Boolean, {
    description: "Visible on the site now",
  })
  live!: boolean;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  updatedAt!: string;
}

@ObjectType("AdminPost", {
  description: "The panel's full view of a post",
})
export class AdminPostModel extends AdminPostSummaryModel {
  @Field(() => String)
  content!: string;

  @Field(() => PostCoverModel, {
    nullable: true,
  })
  cover!: PostCoverModel | null;

  @Field(() => [
    AdminPostTranslationModel,
  ])
  translations!: AdminPostTranslationModel[];
}

export const AdminPostPage = PaginatedType(
  AdminPostSummaryModel,
  "AdminPostPage",
);

@ObjectType("PostOption", {
  description: "A post for parent pickers",
})
export class PostOptionModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String, {
    nullable: true,
  })
  path!: string | null;
}

@ObjectType("PostFolder")
export class PostFolderModel {
  @Field(() => ID, {
    description: "The post's folder in the media library",
  })
  folderId!: string;
}

@ObjectType("AdminPostTag", {
  description: "A tag, counting every non-deleted post",
})
export class AdminPostTagModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => Int)
  postCount!: number;
}

@InputType("UpdatePostInput", {
  description: "Fields to change; omitted ones stay",
})
export class UpdatePostInput {
  @Field(() => String, {
    nullable: true,
  })
  title?: string;

  @Field(() => String, {
    nullable: true,
  })
  content?: string;

  @Field(() => String, {
    nullable: true,
  })
  description?: string | null;

  @Field(
    () => [
      String,
    ],
    {
      nullable: true,
      description: "Tag names in order; new ones are created",
    },
  )
  tags?: string[];

  @Field(() => String, {
    nullable: true,
  })
  slug?: string | null;
}

@InputType("PostTranslationInput")
export class PostTranslationInput {
  @Field(() => String)
  title!: string;

  @Field(() => String, {
    nullable: true,
    description: "null or empty: keep the post's own slug",
  })
  slug?: string | null;

  @Field(() => String, {
    nullable: true,
  })
  content?: string;

  @Field(() => String, {
    nullable: true,
  })
  description?: string | null;
}
