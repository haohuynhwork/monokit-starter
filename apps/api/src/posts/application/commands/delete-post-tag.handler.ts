import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { PostTagNotFoundError } from "../../domain/post.errors.js";
import { checkCanManageTags } from "../../domain/post-tag.js";
import {
  POST_TAG_REPOSITORY,
  type PostTagRepository,
} from "../../domain/post-tag.repository.js";
import { DeletePostTagCommand } from "./delete-post-tag.command.js";

@CommandHandler(DeletePostTagCommand)
export class DeletePostTagHandler
  implements ICommandHandler<DeletePostTagCommand>
{
  constructor(
    @Inject(POST_TAG_REPOSITORY) private readonly tags: PostTagRepository,
  ) {}

  async execute({ tagId, actor }: DeletePostTagCommand): Promise<void> {
    checkCanManageTags(actor);
    if (!(await this.tags.findById(tagId))) {
      throw new PostTagNotFoundError();
    }
    await this.tags.delete(tagId);
  }
}
