import { Logger } from "@nestjs/common";
import type { CommandBus, QueryBus } from "@nestjs/cqrs";
import { CreatePageCommand } from "../pages/application/commands/create-page.command.js";
import { CreatePageLayoutCommand } from "../pages/application/commands/create-page-layout.command.js";
import { PublishPageCommand } from "../pages/application/commands/publish-page.command.js";
import { UpdatePageCommand } from "../pages/application/commands/update-page.command.js";
import { ListPageLayoutsQuery } from "../pages/application/queries/list-page-layouts.query.js";
import { ListPagesQuery } from "../pages/application/queries/list-pages.query.js";
import { IsPostPathTakenQuery } from "../posts/application/queries/is-post-path-taken.query.js";
import { ListUsersQuery } from "../users/application/queries/list-users.query.js";

const PAGES = [
  {
    slug: "about",
    title: "About",
    menuOrder: 10,
    settings: {
      blocks: [
        {
          id: "intro",
          type: "richText",
          props: {
            html: "<p>Tell visitors who you are. Edit this page in the panel under Pages.</p>",
          },
        },
      ],
    },
  },
  {
    slug: "contact",
    title: "Contact",
    menuOrder: 20,
    settings: {
      blocks: [
        {
          id: "form",
          type: "contactForm",
          props: {
            fields: [
              "name",
              "email",
              "subject",
              "message",
            ],
          },
        },
      ],
    },
  },
];

// Idempotent: a default layout when there is none, and About / Contact
// pages unless a page or post already has their path
export async function seedPages(
  commands: CommandBus,
  queries: QueryBus,
): Promise<void> {
  const logger = new Logger("SeedPages");
  const layouts = await queries.execute(new ListPageLayoutsQuery());
  if (!layouts.length) {
    await commands.execute(new CreatePageLayoutCommand("Default", {}));
    logger.log("Created the Default layout");
  }

  const { items: admins } = await queries.execute(
    new ListUsersQuery(
      {
        role: "admin",
        status: "active",
      },
      1,
      0,
    ),
  );
  const author = admins[0];
  if (!author) {
    logger.warn("No active admin; skipped pages");
    return;
  }
  const pages = await queries.execute(new ListPagesQuery());
  for (const { slug, title, menuOrder, settings } of PAGES) {
    if (
      pages.some((p) => p.path === slug) ||
      (await queries.execute(new IsPostPathTakenQuery(slug)))
    ) {
      logger.log(`Skipped /${slug} (taken)`);
      continue;
    }
    const id = await commands.execute(
      new CreatePageCommand(title, null, null, BigInt(author.id)),
    );
    await commands.execute(
      new UpdatePageCommand(id, {
        slug,
        settings,
        showInMenu: true,
        menuOrder,
      }),
    );
    await commands.execute(new PublishPageCommand(id));
    logger.log(`Created page /${slug}`);
  }
}
