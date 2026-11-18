import type { QueryBus } from "@nestjs/cqrs";
import { SendContactMessageCommand } from "../application/commands/send-contact-message.command.js";
import { UpdatePageCommand } from "../application/commands/update-page.command.js";
import { GetPageQuery } from "../application/queries/get-page.query.js";
import { ListPageLayoutsQuery } from "../application/queries/list-page-layouts.query.js";
import type {
  PageLayoutView,
  PageView,
} from "../application/queries/page.view.js";
import {
  PageLayoutNotFoundError,
  PageNotFoundError,
} from "../domain/page.errors.js";
import type { ContactDto, UpdatePageDto } from "./pages.dto.js";

// Shared by the REST controllers and the GraphQL resolvers

export const toId = (id: string | null) => (id === null ? null : BigInt(id));

export function updatePageCommand(
  id: bigint,
  body: UpdatePageDto,
): UpdatePageCommand {
  const { layoutId, ...rest } = body;
  return new UpdatePageCommand(id, {
    ...rest,
    ...(layoutId !== undefined && {
      layoutId: toId(layoutId),
    }),
  });
}

export async function getPage(
  queries: QueryBus,
  id: bigint,
): Promise<PageView> {
  const page = await queries.execute(new GetPageQuery(id));
  if (!page) {
    throw new PageNotFoundError();
  }
  return page;
}

export async function getPageLayout(
  queries: QueryBus,
  id: bigint,
): Promise<PageLayoutView> {
  const layouts = await queries.execute(new ListPageLayoutsQuery());
  const layout = layouts.find((l) => l.id === String(id));
  if (!layout) {
    throw new PageLayoutNotFoundError();
  }
  return layout;
}

// null: a bot filled the honeypot; answer as if sent
export function contactCommand(
  body: ContactDto,
  ip: string | null,
  userAgent: string | null,
): SendContactMessageCommand | null {
  if (body.website) {
    return null;
  }
  return new SendContactMessageCommand(
    BigInt(body.pageId),
    body.blockId,
    body.fields,
    ip,
    userAgent,
  );
}
