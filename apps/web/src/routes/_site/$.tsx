import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPublicPage, getPublicPost } from "@/lib/site/public-api";
import { HtmlLang } from "./-lib/html-lang";
import { PageFrame } from "./-lib/page-frame";
import { PostArticle } from "./-lib/post-article";

// A live page or post at its path, e.g. /about or /travel/paris. Pages and
// posts share these URLs; the page wins (ideas/pages "One URL namespace").
// Static routes (/posts, /products, /login...) take precedence.
export const Route = createFileRoute("/_site/$")({
  loader: async ({ params }) => {
    const path = params._splat ?? "";
    const page = await getPublicPage(path);
    if (page) {
      return {
        page,
        post: null,
      };
    }
    const post = await getPublicPost({
      data: path,
    });
    if (!post) {
      throw notFound();
    }
    return {
      page: null,
      post,
    };
  },
  head: ({ loaderData }) => {
    if (loaderData?.page) {
      const { page } = loaderData;
      return {
        meta: [
          {
            title: page.options["seo.title"] ?? page.title,
          },
          ...(page.description
            ? [
                {
                  name: "description",
                  content: page.description,
                },
              ]
            : []),
          ...(page.options["seo.noindex"]
            ? [
                {
                  name: "robots",
                  content: "noindex",
                },
              ]
            : []),
        ],
      };
    }
    const post = loaderData?.post;
    return {
      meta: post
        ? [
            {
              title: post.title,
            },
            ...(post.description
              ? [
                  {
                    name: "description",
                    content: post.description,
                  },
                ]
              : []),
            {
              property: "og:type",
              content: "article",
            },
            ...(post.coverUrl
              ? [
                  {
                    property: "og:image",
                    content: post.coverUrl,
                  },
                ]
              : []),
          ]
        : [],
    };
  },
  component: PathPage,
});

function PathPage() {
  const { page, post } = Route.useLoaderData();
  if (page) {
    return <PageFrame page={page} />;
  }
  if (!post) {
    return null;
  }
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <HtmlLang lang={post.locale} />
      <PostArticle post={post} />
    </main>
  );
}
