import { Button } from "@packages/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getLatestPosts, getPublicPage } from "@/lib/site/public-api";
import { PageFrame } from "./-lib/page-frame";
import { PostList } from "./-lib/post-article";

// The page with the path "home" when there is one, else the latest posts
export const Route = createFileRoute("/_site/")({
  loader: async () => {
    const page = await getPublicPage("home");
    return {
      page,
      posts: page
        ? []
        : await getLatestPosts({
            data: {
              limit: 10,
            },
          }),
    };
  },
  component: HomePage,
});

function HomePage() {
  const { page, posts } = Route.useLoaderData();
  if (page) {
    return <PageFrame page={page} />;
  }
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Monokit</h1>
      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          <p>
            Nothing published yet. Publish a page with the slug{" "}
            <code>home</code> to replace this.
          </p>
          <Button asChild>
            <a href="/admin/posts">Write a post</a>
          </Button>
        </div>
      ) : (
        <>
          <PostList posts={posts} />
          <Button variant="outline" asChild className="mt-6">
            <Link
              to="/posts"
              search={{
                q: undefined,
                tag: undefined,
                page: undefined,
              }}
            >
              All posts
            </Link>
          </Button>
        </>
      )}
    </main>
  );
}
