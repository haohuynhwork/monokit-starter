import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { PostTagNotFoundError } from "../../domain/post.errors.js";
import { checkCanManageTags } from "../../domain/post-tag.js";
import {
  POST_TAG_REPOSITORY,
  type PostTagRepository,
} from "../../domain/post-tag.repository.js";
import { RenamePostTagCommand } from "./rename-post-tag.command.js";

@CommandHandler(RenamePostTagCommand)
export class RenamePostTagHandler
  implements ICommandHandler<RenamePostTagCommand>
{
  constructor(
    @Inject(POST_TAG_REPOSITORY) private readonly tags: PostTagRepository,
  ) {}

  async execute({ tagId, name, actor }: RenamePostTagCommand): Promise<void> {
    checkCanManageTags(actor);
    const tag = await this.tags.findById(tagId);
    if (!tag) {
      throw new PostTagNotFoundError();
    }
    tag.rename(name);
    await this.tags.save(tag);
  }
}
