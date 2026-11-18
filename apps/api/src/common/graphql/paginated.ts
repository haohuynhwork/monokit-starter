import type { Type } from "@nestjs/common";
import { Field, Int, ObjectType } from "@nestjs/graphql";
import type { Paginated } from "../http/responses/paginated.js";

@ObjectType("PaginationMeta")
export class PaginationMetaModel {
  @Field(() => Int, {
    description: "Matching items across all pages",
  })
  total!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  offset!: number;
}

// GraphQL shape of a REST Paginated: { items, meta }. One class per item type:
// export const PostPage = PaginatedType(PostModel, "PostPage");
export function PaginatedType<T>(item: Type<T>, name: string) {
  @ObjectType(name)
  class Page {
    @Field(() => [
      item,
    ])
    items!: T[];

    @Field(() => PaginationMetaModel)
    meta!: PaginationMetaModel;
  }
  return Page;
}

// A Paginated is already { items, meta }; this only narrows the type
export const page = <T>(p: Paginated<T>) => ({
  items: p.items,
  meta: p.meta,
});
