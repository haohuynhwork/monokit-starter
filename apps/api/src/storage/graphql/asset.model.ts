import { Field, ID, InputType, Int, ObjectType } from "@nestjs/graphql";

// GraphQL shapes of the asset views (application/queries/asset.view.ts,
// list-assets.query.ts, list-folders.query.ts) and the http DTO inputs.
// Types are spelled out in @Field: the test runner emits no decorator metadata.

@ObjectType("StorageAsset", {
  description: "A media library item: file, directory or link",
})
export class StorageAssetModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, {
    nullable: true,
  })
  parentId!: string | null;

  @Field(() => String, {
    description: "file, directory or link",
  })
  kind!: string;

  @Field(() => String, {
    description: "public or private",
  })
  visibility!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String, {
    description: "Full path in the library",
  })
  path!: string;

  @Field(() => String, {
    nullable: true,
  })
  mimeType!: string | null;

  @Field(() => String, {
    nullable: true,
    description: "Size in bytes (a string: may exceed Int)",
  })
  sizeBytes!: string | null;

  @Field(() => String, {
    nullable: true,
    description:
      "Ready-to-use URL: public URL, a short-lived signed link, or the external link",
  })
  url!: string | null;

  @Field(() => String, {
    description: "Public permanent key; rich text references it as serve/<key>",
  })
  key!: string;

  @Field(() => ID, {
    nullable: true,
  })
  createdById!: string | null;

  @Field(() => String, {
    description: "ISO 8601 timestamp",
  })
  createdAt!: string;

  @Field(() => String, {
    description: "ISO 8601 timestamp",
  })
  updatedAt!: string;
}

@ObjectType("StorageCrumb")
export class StorageCrumbModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;
}

@ObjectType("StorageAssetListing", {
  description: "A folder's content (root when folder is null)",
})
export class StorageAssetListingModel {
  @Field(() => StorageAssetModel, {
    nullable: true,
  })
  folder!: StorageAssetModel | null;

  @Field(() => [
    StorageCrumbModel,
  ])
  breadcrumbs!: StorageCrumbModel[];

  @Field(() => [
    StorageAssetModel,
  ])
  items!: StorageAssetModel[];

  @Field(() => Int)
  total!: number;
}

@ObjectType("StorageFolder", {
  description: "A folder, for move pickers",
})
export class StorageFolderModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  path!: string;
}

@InputType("CreateStorageFolderInput")
export class CreateStorageFolderInput {
  @Field(() => ID, {
    nullable: true,
  })
  parentId?: string | null;

  @Field(() => String)
  name!: string;

  @Field(() => String, {
    nullable: true,
    description: "public or private (default private)",
  })
  visibility?: string;
}

@InputType("CreateStorageLinkInput")
export class CreateStorageLinkInput {
  @Field(() => ID, {
    nullable: true,
  })
  parentId?: string | null;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  url!: string;
}

@InputType("UpdateStorageAssetInput", {
  description: "Rename, change visibility, or change a link's URL",
})
export class UpdateStorageAssetInput {
  @Field(() => String, {
    nullable: true,
  })
  name?: string;

  @Field(() => String, {
    nullable: true,
  })
  visibility?: string;

  @Field(() => String, {
    nullable: true,
  })
  url?: string;
}
