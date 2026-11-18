import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPublicPost } from "@/lib/site/public-api";
import { HtmlLang } from "../-lib/html-lang";
import { PostArticle } from "../-lib/post-article";

// A post by its slug (top-level path); nested paths are served by the
// catch-all (../$.tsx)
export const Route = createFileRoute("/_site/posts/$slug")({
  loader: async ({ params }) => {
    const post = await getPublicPost({
      data: params.slug,
    });
    if (!post) {
      throw notFound();
    }
    return post;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          {
            title: loaderData.title,
          },
          ...(loaderData.description
            ? [
                {
                  name: "description",
                  content: loaderData.description,
                },
              ]
            : []),
        ]
      : [],
  }),
  component: PostPage,
});

function PostPage() {
  const post = Route.useLoaderData();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <HtmlLang lang={post.locale} />
      <PostArticle post={post} />
    </main>
  );
}
