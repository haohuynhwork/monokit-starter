import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Args, ID, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { z } from "zod";
import {
  type AuthUser,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { CreateFolderCommand } from "../application/commands/create-folder.command.js";
import { CreateLinkCommand } from "../application/commands/create-link.command.js";
import { DeleteAssetCommand } from "../application/commands/delete-asset.command.js";
import { MoveAssetCommand } from "../application/commands/move-asset.command.js";
import { RenameAssetCommand } from "../application/commands/rename-asset.command.js";
import { SetAssetVisibilityCommand } from "../application/commands/set-asset-visibility.command.js";
import { SetLinkUrlCommand } from "../application/commands/set-link-url.command.js";
import type { AssetView } from "../application/queries/asset.view.js";
import { GetAssetQuery } from "../application/queries/get-asset.query.js";
import {
  type AssetListing,
  ListAssetsQuery,
} from "../application/queries/list-assets.query.js";
import {
  type FolderOption,
  ListFoldersQuery,
} from "../application/queries/list-folders.query.js";
import { AssetNotFoundError } from "../domain/asset.errors.js";
import type { Actor } from "../domain/asset.js";
import {
  type ByPathDto,
  byPathSchema,
  type CreateFolderDto,
  type CreateLinkDto,
  createFolderSchema,
  createLinkSchema,
  type ListAssetsDto,
  listAssetsSchema,
  type MoveAssetDto,
  moveAssetSchema,
  type UpdateAssetDto,
  updateAssetSchema,
} from "../http/assets.dto.js";
import {
  CreateStorageFolderInput,
  CreateStorageLinkInput,
  StorageAssetListingModel,
  StorageAssetModel,
  StorageFolderModel,
  UpdateStorageAssetInput,
} from "./asset.model.js";

const listArgs = new ZodValidationPipe(listAssetsSchema);
const byPathArgs = new ZodValidationPipe(byPathSchema);
const moveArgs = new ZodValidationPipe(moveAssetSchema);
const idArg = {
  type: () => ID,
} as const;

const toActor = (user: AuthUser): Actor => ({
  id: user.id,
  permissions: user.permissions,
});
const toId = (id: string | null | undefined) =>
  id === null || id === undefined ? null : BigInt(id);
// GraphQL sends absent optional args as undefined or null; zod wants undefined
const defined = <T extends object>(input: T) =>
  Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== null && v !== undefined),
  );
// An input object validated by an http DTO schema, nulls dropped first
const inputPipe = <T extends z.ZodType>(schema: T) => {
  const pipe = new ZodValidationPipe(schema);
  return {
    transform: (value: object): z.infer<T> => pipe.transform(defined(value)),
  };
};

// Same as AssetsController: every signed-in user may browse and add;
// changing an item needs admin/editor or being its creator (domain).
// Uploads and file bytes stay on REST (AssetView.url is the ready link).
@RequirePermission("asset:upload", "asset:manage:any")
@Resolver(() => StorageAssetModel)
export class AssetsResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Query(() => StorageAssetListingModel, {
    description: "List a folder (root without folderId); q searches below it",
  })
  async assets(
    @CurrentUser() user: AuthUser,
    @Args("folderId", {
      type: () => ID,
      nullable: true,
    })
    folderId?: string,
    @Args("q", {
      type: () => String,
      nullable: true,
    })
    q?: string,
    @Args("type", {
      type: () => String,
      nullable: true,
      description: "all (default) or image",
    })
    type?: string,
    @Args("sort", {
      type: () => String,
      nullable: true,
      description: "name (default), createdAt or size",
    })
    sort?: string,
    @Args("order", {
      type: () => String,
      nullable: true,
      description: "asc (default) or desc",
    })
    order?: string,
    @Args("limit", {
      type: () => Int,
      nullable: true,
    })
    limit?: number,
    @Args("offset", {
      type: () => Int,
      nullable: true,
    })
    offset?: number,
  ): Promise<AssetListing> {
    const query: ListAssetsDto = listArgs.transform(
      defined({
        folderId,
        q,
        type,
        sort,
        order,
        limit,
        offset,
      }),
    );
    const { folderId: folder, ...options } = query;
    const listing = await this.queries.execute(
      new ListAssetsQuery(toId(folder), user.id, options, user),
    );
    if (!listing) {
      throw new AssetNotFoundError();
    }
    return listing;
  }

  @Query(
    () => [
      StorageFolderModel,
    ],
    {
      description: "All folders, for move pickers",
    },
  )
  assetFolders(): Promise<FolderOption[]> {
    return this.queries.execute(new ListFoldersQuery());
  }

  @Query(() => StorageAssetModel, {
    description: "Find an item by its full path",
  })
  assetByPath(
    @CurrentUser() user: AuthUser,
    @Args("path", {
      type: () => String,
    })
    path: string,
  ): Promise<AssetView> {
    const query: ByPathDto = byPathArgs.transform({
      path,
    });
    return this.found(
      this.queries.execute(
        new GetAssetQuery(
          {
            path: query.path,
          },
          user.id,
          user,
        ),
      ),
    );
  }

  @Query(() => StorageAssetModel, {
    description: "Get an item",
  })
  asset(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<AssetView> {
    return this.get(id, user);
  }

  @Mutation(() => StorageAssetModel, {
    description: "Create a folder",
  })
  async createAssetFolder(
    @CurrentUser() user: AuthUser,
    @Args(
      "input",
      {
        type: () => CreateStorageFolderInput,
      },
      inputPipe(createFolderSchema),
    )
    input: CreateFolderDto,
  ): Promise<AssetView> {
    const id = await this.commands.execute(
      new CreateFolderCommand(
        toId(input.parentId),
        input.name,
        toActor(user),
        input.visibility,
      ),
    );
    return this.get(id, user);
  }

  @Mutation(() => StorageAssetModel, {
    description: "Add a link to an external resource",
  })
  async createAssetLink(
    @CurrentUser() user: AuthUser,
    @Args(
      "input",
      {
        type: () => CreateStorageLinkInput,
      },
      inputPipe(createLinkSchema),
    )
    input: CreateLinkDto,
  ): Promise<AssetView> {
    const id = await this.commands.execute(
      new CreateLinkCommand(
        toId(input.parentId),
        input.name,
        input.url,
        toActor(user),
      ),
    );
    return this.get(id, user);
  }

  @Mutation(() => StorageAssetModel, {
    description: "Rename, change visibility, or change a link's URL",
  })
  async updateAsset(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
    @Args(
      "input",
      {
        type: () => UpdateStorageAssetInput,
      },
      inputPipe(updateAssetSchema),
    )
    body: UpdateAssetDto,
  ): Promise<AssetView> {
    if (body.name !== undefined) {
      await this.commands.execute(
        new RenameAssetCommand(id, body.name, toActor(user)),
      );
    }
    if (body.url !== undefined) {
      await this.commands.execute(
        new SetLinkUrlCommand(id, body.url, toActor(user)),
      );
    }
    if (body.visibility !== undefined) {
      await this.commands.execute(
        new SetAssetVisibilityCommand(id, body.visibility, toActor(user)),
      );
    }
    return this.get(id, user);
  }

  @Mutation(() => StorageAssetModel, {
    description: "Move into a folder (parentId null: the root)",
  })
  async moveAsset(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
    @Args("parentId", {
      type: () => ID,
      nullable: true,
    })
    parentId: string | null,
  ): Promise<AssetView> {
    const body: MoveAssetDto = moveArgs.transform({
      parentId: parentId ?? null,
    });
    await this.commands.execute(
      new MoveAssetCommand(id, toId(body.parentId), toActor(user)),
    );
    return this.get(id, user);
  }

  @Mutation(() => Boolean, {
    description: "Delete an item, and everything in it for a folder",
  })
  async deleteAsset(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<boolean> {
    await this.commands.execute(new DeleteAssetCommand(id, toActor(user)));
    return true;
  }

  private get(id: bigint, user: AuthUser): Promise<AssetView> {
    return this.found(
      this.queries.execute(
        new GetAssetQuery(
          {
            id,
          },
          user.id,
          user,
        ),
      ),
    );
  }

  private async found(view: Promise<AssetView | null>): Promise<AssetView> {
    const asset = await view;
    if (!asset) {
      throw new AssetNotFoundError();
    }
    return asset;
  }
}
