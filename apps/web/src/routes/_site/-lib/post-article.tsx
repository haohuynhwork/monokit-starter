import { Badge } from "@packages/ui/components/badge";
import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { useContentLightbox } from "@/components/lightbox/use-content-lightbox";
import type { PublicPost } from "@/lib/types";

// The post's own locale ('und' when none are set up: the runtime's)
const dateLocale = (post: PublicPost) =>
  post.locale && post.locale !== "und" ? post.locale : undefined;

// A published post's body, for /<post path>. Its images (cover included)
// open full screen on click.
export function PostArticle({ post }: { post: PublicPost }) {
  const ref = useRef<HTMLElement>(null);
  useContentLightbox(ref, post.content);
  return (
    <article ref={ref}>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <time dateTime={post.publishedAt}>
            {new Date(post.publishedAt).toLocaleDateString(dateLocale(post), {
              dateStyle: "long",
            })}
          </time>
        </p>
        {post.coverUrl && (
          <img
            src={post.coverUrl}
            alt=""
            className="mt-6 aspect-video w-full rounded-lg object-cover"
          />
        )}
      </header>
      <PostBody html={post.content} />
      {post.tags.length > 0 && (
        <ul className="mt-10 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <li key={t.slug}>
              <Badge variant="outline" asChild>
                <Link
                  to="/posts/tags/$slug"
                  params={{
                    slug: t.slug,
                  }}
                >
                  {t.name}
                </Link>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

// Sanitized by the api (allowlist) before it was stored; styled by
// /styles/content.css, loaded by routes/_site.tsx
export function PostBody({ html }: { html: string }) {
  return (
    <div
      className="app_content"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server-side
      dangerouslySetInnerHTML={{
        __html: html,
      }}
    />
  );
}

export function PostList({ posts }: { posts: PublicPost[] }) {
  return (
    <ul className="flex flex-col divide-y">
      {posts.map((post) => (
        <li key={post.path} className="py-4">
          <Link
            to="/$"
            params={{
              _splat: post.path,
            }}
            className="group block"
          >
            <h2 className="text-lg font-semibold tracking-tight group-hover:underline">
              {post.title}
            </h2>
            {post.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {post.description}
              </p>
            )}
            <time
              dateTime={post.publishedAt}
              className="mt-2 block text-sm text-muted-foreground"
            >
              {new Date(post.publishedAt).toLocaleDateString(dateLocale(post), {
                dateStyle: "medium",
              })}
            </time>
          </Link>
        </li>
      ))}
    </ul>
  );
}
