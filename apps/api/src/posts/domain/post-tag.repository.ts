import type { PostTag } from "./post-tag.js";

export interface PostTagRepository {
  findById(id: bigint): Promise<PostTag | null>;
  // slug -> id for the tags that exist
  findIdsBySlugs(slugs: string[]): Promise<Map<string, bigint>>;
  // Creates the tags missing by slug (a concurrent create of the same slug
  // is not an error) and returns slug -> id for all of them
  ensure(
    tags: {
      name: string;
      slug: string;
    }[],
  ): Promise<Map<string, bigint>>;
  // Updates name and slug; PostTagTakenError when the slug is used
  save(tag: PostTag): Promise<void>;
  // Hard delete; its taggings go with it
  delete(id: bigint): Promise<void>;
}

export const POST_TAG_REPOSITORY = Symbol("POST_TAG_REPOSITORY");
