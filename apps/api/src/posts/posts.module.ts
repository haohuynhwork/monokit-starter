import { Module } from "@nestjs/common";
import { HTML_SANITIZER } from "../common/domain/html.js";
import { SanitizeHtmlSanitizer } from "../common/infrastructure/sanitize-html.sanitizer.js";
import { CreatePostHandler } from "./application/commands/create-post.handler.js";
import { DeletePostHandler } from "./application/commands/delete-post.handler.js";
import { DeletePostTagHandler } from "./application/commands/delete-post-tag.handler.js";
import { DeletePostTranslationHandler } from "./application/commands/delete-post-translation.handler.js";
import { EnsurePostFolderHandler } from "./application/commands/ensure-post-folder.handler.js";
import { MovePostHandler } from "./application/commands/move-post.handler.js";
import { PublishPostHandler } from "./application/commands/publish-post.handler.js";
import { RenamePostTagHandler } from "./application/commands/rename-post-tag.handler.js";
import { SetPostCoverHandler } from "./application/commands/set-post-cover.handler.js";
import { SetPostTranslationHandler } from "./application/commands/set-post-translation.handler.js";
import { UnpublishPostHandler } from "./application/commands/unpublish-post.handler.js";
import { UpdatePostHandler } from "./application/commands/update-post.handler.js";
import { GetPostHandler } from "./application/queries/get-post.handler.js";
import { GetPublicPostHandler } from "./application/queries/get-public-post.handler.js";
import { IsPostPathTakenHandler } from "./application/queries/is-post-path-taken.handler.js";
import { ListPostOptionsHandler } from "./application/queries/list-post-options.handler.js";
import { ListPostTagsHandler } from "./application/queries/list-post-tags.handler.js";
import { ListPostsHandler } from "./application/queries/list-posts.handler.js";
import {
  CountPublicPostsHandler,
  ListPublicPostsHandler,
} from "./application/queries/list-public-posts.handler.js";
import { POST_REPOSITORY } from "./domain/post.repository.js";
import { POST_TAG_REPOSITORY } from "./domain/post-tag.repository.js";
import { PostTagsResolver } from "./graphql/post-tags.resolver.js";
import { PostsResolver } from "./graphql/posts.resolver.js";
import { PublicPostsResolver } from "./graphql/public-posts.resolver.js";
import { PostTagsController } from "./http/post-tags.controller.js";
import { PostsController } from "./http/posts.controller.js";
import { PublicPostsController } from "./http/public-posts.controller.js";
import { PrismaPostRepository } from "./infrastructure/prisma-post.repository.js";
import { PrismaPostTagRepository } from "./infrastructure/prisma-post-tag.repository.js";

@Module({
  // PostTagsController first: /posts/tags must win over /posts/:id
  controllers: [
    PostTagsController,
    PostsController,
    PublicPostsController,
  ],
  providers: [
    {
      provide: POST_REPOSITORY,
      useClass: PrismaPostRepository,
    },
    {
      provide: POST_TAG_REPOSITORY,
      useClass: PrismaPostTagRepository,
    },
    {
      provide: HTML_SANITIZER,
      useClass: SanitizeHtmlSanitizer,
    },
    CreatePostHandler,
    UpdatePostHandler,
    MovePostHandler,
    PublishPostHandler,
    UnpublishPostHandler,
    SetPostCoverHandler,
    DeletePostHandler,
    SetPostTranslationHandler,
    DeletePostTranslationHandler,
    EnsurePostFolderHandler,
    RenamePostTagHandler,
    DeletePostTagHandler,
    ListPostsHandler,
    GetPostHandler,
    ListPostOptionsHandler,
    GetPublicPostHandler,
    ListPublicPostsHandler,
    CountPublicPostsHandler,
    ListPostTagsHandler,
    IsPostPathTakenHandler,
    PublicPostsResolver,
    PostsResolver,
    PostTagsResolver,
  ],
})
export class PostsModule {}
