import { Field, ID, InputType, Int, ObjectType } from "@nestjs/graphql";
import { JSONScalar } from "../../common/graphql/json.scalar.js";

// GraphQL shapes of the page views (application/queries/page.view.ts) and of
// the REST bodies (http/pages.dto.ts, which still validates them).
// Types are spelled out in @Field: the test runner emits no decorator metadata.

@ObjectType("PageSummary", {
  description: "A page as a row of the panel's tree (no settings)",
})
export class PageSummaryModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, {
    nullable: true,
  })
  parentId!: string | null;

  @Field(() => ID, {
    nullable: true,
  })
  layoutId!: string | null;

  @Field(() => String)
  title!: string;

  @Field(() => String, {
    nullable: true,
  })
  slug!: string | null;

  @Field(() => String, {
    nullable: true,
    description: "Full path; null while not reachable (no slug here or above)",
  })
  path!: string | null;

  @Field(() => String, {
    description: "draft, scheduled or published",
  })
  status!: string;

  @Field(() => String, {
    nullable: true,
    description: "ISO 8601 timestamp",
  })
  publishedAt!: string | null;

  @Field(() => Boolean, {
    description: "Visible on the site now",
  })
  live!: boolean;

  @Field(() => Boolean)
  showInMenu!: boolean;

  @Field(() => Int)
  menuOrder!: number;

  @Field(() => String)
  updatedAt!: string;
}

@ObjectType("Page", {
  description: "A page as the panel's editor sees it",
})
export class PageModel extends PageSummaryModel {
  @Field(() => String, {
    nullable: true,
  })
  description!: string | null;

  @Field(() => JSONScalar, {
    description: "As stored: { version, layout, options..., blocks }",
  })
  settings!: Record<string, unknown>;

  @Field(() => String)
  createdAt!: string;
}

@ObjectType("PageBlock", {
  description: "A block of a live page",
})
export class PageBlockModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  type!: string;

  @Field(() => JSONScalar)
  props!: Record<string, unknown>;
}

@ObjectType("PublicPage", {
  description: "A live page, layout resolved, as the website renders it",
})
export class PublicPageModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  path!: string;

  @Field(() => String, {
    nullable: true,
  })
  description!: string | null;

  @Field(() => String)
  publishedAt!: string;

  @Field(() => JSONScalar)
  layout!: unknown;

  @Field(() => JSONScalar)
  options!: unknown;

  @Field(() => [
    PageBlockModel,
  ])
  blocks!: PageBlockModel[];
}

@ObjectType("MenuItem", {
  description: "An entry of the site header menu",
})
export class MenuItemModel {
  @Field(() => String)
  title!: string;

  @Field(() => String)
  path!: string;

  @Field(() => [
    MenuItemModel,
  ])
  children!: MenuItemModel[];
}

@ObjectType("PageLayout", {
  description: "A shared page frame",
})
export class PageLayoutModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => Boolean)
  isDefault!: boolean;

  @Field(() => JSONScalar)
  settings!: unknown;

  @Field(() => Int, {
    description:
      "Pages using it (pages without a layout count for the default)",
  })
  pageCount!: number;

  @Field(() => String)
  updatedAt!: string;
}

@InputType("CreatePageInput")
export class CreatePageInput {
  @Field(() => String)
  title!: string;

  @Field(() => ID, {
    nullable: true,
  })
  parentId?: string | null;

  @Field(() => ID, {
    nullable: true,
  })
  layoutId?: string | null;
}

@InputType("UpdatePageInput", {
  description: "Only the fields given change",
})
export class UpdatePageInput {
  @Field(() => String, {
    nullable: true,
  })
  title?: string;

  @Field(() => String, {
    nullable: true,
  })
  description?: string | null;

  @Field(() => String, {
    nullable: true,
  })
  slug?: string | null;

  @Field(() => JSONScalar, {
    nullable: true,
    description: "{ version?, layout?, <options>, blocks }",
  })
  settings?: Record<string, unknown>;

  @Field(() => ID, {
    nullable: true,
  })
  layoutId?: string | null;

  @Field(() => Boolean, {
    nullable: true,
  })
  showInMenu?: boolean;

  @Field(() => Int, {
    nullable: true,
  })
  menuOrder?: number;
}

@InputType("PageLayoutInput")
export class PageLayoutInput {
  @Field(() => String)
  name!: string;

  @Field(() => JSONScalar, {
    nullable: true,
  })
  settings?: Record<string, unknown>;
}

@InputType("UpdatePageLayoutInput", {
  description: "Only the fields given change",
})
export class UpdatePageLayoutInput {
  @Field(() => String, {
    nullable: true,
  })
  name?: string;

  @Field(() => JSONScalar, {
    nullable: true,
  })
  settings?: Record<string, unknown>;
}

@InputType("ContactFormInput", {
  description: "A message sent through a page's contact form",
})
export class ContactFormInput {
  @Field(() => ID)
  pageId!: string;

  @Field(() => String)
  blockId!: string;

  @Field(() => JSONScalar, {
    description: "Field name -> value (strings)",
  })
  fields!: Record<string, string>;

  @Field(() => String, {
    nullable: true,
    description: "Honeypot: leave empty",
  })
  website?: string;
}
