import { createFileRoute, notFound } from "@tanstack/react-router";
import { getLatestPosts, getPostTags } from "@/lib/site/public-api";
import { PostList } from "../../-lib/post-article";

// Only tags with live posts are listed, so a tag without any is not found.
// The api's public list has no paging here; 50 is its maximum.
export const Route = createFileRoute("/_site/posts/tags/$slug")({
  loader: async ({ params }) => {
    const tags = await getPostTags();
    const tag = tags.find((t) => t.slug === params.slug);
    if (!tag) {
      throw notFound();
    }
    return {
      tag,
      posts: await getLatestPosts({
        data: {
          limit: 50,
          tag: tag.slug,
        },
      }),
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData ? `Posts tagged ${loaderData.tag.name}` : "Not found",
      },
    ],
  }),
  component: TagPage,
});

function TagPage() {
  const { tag, posts } = Route.useLoaderData();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Posts tagged {tag.name}
      </h1>
      <PostList posts={posts} />
    </main>
  );
}
