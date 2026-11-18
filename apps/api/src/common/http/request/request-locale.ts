import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { requestOf } from "./request.js";

// Locale tags a request asks for, best first: `?locale=` wins, then
// Accept-Language by q-value. Resolve them with geo's ResolveLocaleQuery.
export const RequestLocale = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string[] => {
    const req = requestOf(ctx);
    const query = req.query?.locale;
    const tags =
      typeof query === "string" && query
        ? [
            query,
          ]
        : [];
    return [
      ...tags,
      ...parseAcceptLanguage(req.headers?.["accept-language"]),
    ];
  },
);

// "vi-VN,vi;q=0.9,en;q=0.5" -> ["vi-VN", "vi", "en"]; "*" and q=0 dropped
export function parseAcceptLanguage(header: string | undefined): string[] {
  if (!header) {
    return [];
  }
  return header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return {
        tag: tag.trim(),
        q: q ? Number(q.slice(2)) : 1,
        index,
      };
    })
    .filter((t) => t.tag && t.tag !== "*" && t.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .slice(0, 10)
    .map((t) => t.tag);
}
