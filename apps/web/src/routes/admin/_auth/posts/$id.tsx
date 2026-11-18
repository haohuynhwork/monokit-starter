import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { textParam } from "@/lib/search";
import type { Locale, Post, PostOption } from "@/lib/types";
import { PostEditor } from "@/routes/admin/_auth/posts/-lib/post-editor";
import { PostTranslationEditor } from "@/routes/admin/_auth/posts/-lib/post-translation-editor";

export const Route = createFileRoute("/admin/_auth/posts/$id")({
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    error?: string;
    lang?: string;
  } => ({
    // Set when creating saved the post but not the rest (savePost)
    error: textParam(s.error),
    // ?lang=vi-VN: that locale's translation (ideas/i18n)
    lang: textParam(s.lang),
  }),
  loader: async ({ params }) => {
    if (!/^[1-9]\d*$/.test(params.id)) {
      throw notFound();
    }
    const [post, options, locales] = await Promise.all([
      api<Post>(`/posts/${params.id}`),
      api<PostOption[]>("/posts/options"),
      api<Locale[]>("/locales"),
    ]);
    if (post.status !== "success" || !post.data) {
      throw notFound();
    }
    return {
      post: post.data,
      options: options.status === "success" && options.data ? options.data : [],
      active:
        locales.status === "success" && locales.data
          ? locales.data.filter((l) => l.active)
          : [],
    };
  },
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: EditPostPage,
});

function EditPostPage() {
  const { post: data, options, active } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const { error, lang } = Route.useSearch();
  const current = active.find((l) => l.code === lang && !l.isDefault);
  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/admin/posts"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Posts
      </Link>
      {active.length > 1 && (
        <LocaleTabs post={data} locales={active} current={current} />
      )}
      {current ? (
        <PostTranslationEditor
          key={`${current.code}-${data.updatedAt}`}
          post={data}
          locale={current}
        />
      ) : (
        <PostEditor
          // Fresh editor state after saving or publishing
          key={data.updatedAt}
          post={data}
          options={options}
          // Mirrors the api's rule (checkCanPublish); the api enforces it
          canPublish={user.role !== "author"}
          error={error}
        />
      )}
    </div>
  );
}

// One tab per active locale: the default edits the post itself, the others
// its translations; a dot marks the translated ones
function LocaleTabs({
  post,
  locales,
  current,
}: {
  post: Post;
  locales: Locale[];
  current?: Locale;
}) {
  return (
    <nav className="flex flex-wrap gap-1 border-b" aria-label="Language">
      {locales.map((l) => {
        const selected = current ? current.code === l.code : l.isDefault;
        const translated =
          l.isDefault || post.translations.some((t) => t.locale === l.code);
        return (
          <Link
            key={l.code}
            to="/admin/posts/$id"
            params={{
              id: post.id,
            }}
            search={
              l.isDefault
                ? {}
                : {
                    lang: l.code,
                  }
            }
            // Exact: the default tab's empty search would match every tab
            activeOptions={{
              exact: true,
            }}
            aria-current={selected ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              selected
                ? "border-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {l.nativeName}
            {l.isDefault ? " (default)" : translated ? " ●" : ""}
          </Link>
        );
      })}
    </nav>
  );
}
