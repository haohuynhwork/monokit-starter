import { api } from "@/lib/api";
import type { Category, PostTag } from "@/lib/types";
import type { BlockChoices } from "./block-editor";

// Product categories and post tags, for productGrid and postList blocks
export async function loadChoices(): Promise<BlockChoices> {
  const [categories, tags] = await Promise.all([
    api<Category[]>("/shop/categories"),
    api<PostTag[]>("/posts/tags"),
  ]);
  return {
    categories: categories.status === "success" ? (categories.data ?? []) : [],
    tags: tags.status === "success" ? (tags.data ?? []) : [],
  };
}
