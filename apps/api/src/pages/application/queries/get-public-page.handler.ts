import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { ResolveContentUrlsQuery } from "../../../storage/application/queries/resolve-content-urls.query.js";
import { type Block, sanitizeBlocks } from "../../domain/block-types.js";
import {
  checkLayoutSettings,
  type LayoutSettings,
  resolveLayout,
} from "../../domain/page-layout.js";
import { fromStored, resolveOptions } from "../../domain/page-settings.js";
import { GetPublicPageQuery } from "./get-public-page.query.js";
import type { PublicPageView } from "./page.view.js";

@QueryHandler(GetPublicPageQuery)
export class GetPublicPageHandler implements IQueryHandler<GetPublicPageQuery> {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly queries: QueryBus,
  ) {}

  async execute({ path }: GetPublicPageQuery): Promise<PublicPageView | null> {
    const row = await this.db.orm.public.Page.select(
      "id",
      "title",
      "fullSlug",
      "description",
      "settings",
      "layoutId",
      "publishedAt",
    )
      .where((p) => p.fullSlug.eq(path as never))
      .where((p) => p.deletedAt.isNull())
      .where((p) => p.status.neq("draft"))
      .where((p) => p.publishedAt.lte(new Date().toISOString() as never))
      .first();
    if (!row?.fullSlug || !row.publishedAt) {
      return null;
    }
    const settings = fromStored(row.settings);
    const layout = resolveLayout(
      await this.layout(row.layoutId),
      settings.layout,
    );
    const [blocks, sidebar] = await this.withFileUrls([
      settings.blocks,
      layout.sidebar?.blocks ?? [],
    ]);
    return {
      id: String(row.id),
      title: row.title,
      path: row.fullSlug,
      description: row.description,
      publishedAt: row.publishedAt,
      layout: layout.sidebar
        ? {
            ...layout,
            sidebar: {
              ...layout.sidebar,
              blocks: sidebar!,
            },
          }
        : layout,
      options: resolveOptions(settings),
      blocks: blocks!,
    };
  }

  // Rich text's 'serve/<key>' references as file URLs, in one lookup
  private async withFileUrls(lists: Block[][]): Promise<Block[][]> {
    const htmls: string[] = [];
    for (const blocks of lists) {
      sanitizeBlocks(blocks, (html) => {
        htmls.push(html);
        return html;
      });
    }
    const resolved = await this.queries.execute(
      new ResolveContentUrlsQuery(htmls),
    );
    let i = 0;
    return lists.map((blocks) => sanitizeBlocks(blocks, () => resolved[i++]!));
  }

  // The page's layout, else the default; none means code defaults
  private async layout(id: bigint | null): Promise<LayoutSettings | null> {
    const q = this.db.orm.public.PageLayout.select("settings").where((l) =>
      l.deletedAt.isNull(),
    );
    const row = await (id === null
      ? q.where({
          isDefault: true,
        })
      : q.where({
          id,
        })
    ).first();
    return row ? checkLayoutSettings(row.settings) : null;
  }
}
