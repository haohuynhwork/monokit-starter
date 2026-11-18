import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExcludeEndpoint,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import {
  type AuthUser,
  CurrentUser,
  Public,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import {
  ApiFailResponse,
  ApiZodBody,
  ApiZodQuery,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { CreateFolderCommand } from "../application/commands/create-folder.command.js";
import { CreateLinkCommand } from "../application/commands/create-link.command.js";
import { DeleteAssetCommand } from "../application/commands/delete-asset.command.js";
import { MoveAssetCommand } from "../application/commands/move-asset.command.js";
import { RenameAssetCommand } from "../application/commands/rename-asset.command.js";
import { SetAssetVisibilityCommand } from "../application/commands/set-asset-visibility.command.js";
import { SetLinkUrlCommand } from "../application/commands/set-link-url.command.js";
import { UploadAssetCommand } from "../application/commands/upload-asset.command.js";
import type { AssetView } from "../application/queries/asset.view.js";
import { GetAssetQuery } from "../application/queries/get-asset.query.js";
import { GetSignedFileQuery } from "../application/queries/get-signed-file.query.js";
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
import { LIBRARY_POLICY } from "../domain/file-policy.js";
import {
  assetListingSchema,
  assetViewSchema,
  type ByPathDto,
  byPathSchema,
  type CreateFolderDto,
  type CreateLinkDto,
  createFolderSchema,
  createLinkSchema,
  folderOptionsSchema,
  type ListAssetsDto,
  listAssetsSchema,
  type MoveAssetDto,
  moveAssetSchema,
  type SignedContentDto,
  signedContentSchema,
  type UpdateAssetDto,
  type UploadDto,
  updateAssetSchema,
  uploadSchema,
} from "./assets.dto.js";
import { sendFile } from "./send-file.js";

// Multer's file, the fields used here
interface UploadedLibraryFile {
  buffer: Buffer;
  originalname: string;
}

// A little above the policy, so storage reports the real error
const UPLOAD_LIMIT = LIBRARY_POLICY.maxBytes + 1;

const toActor = (user: AuthUser): Actor => ({
  id: user.id,
  permissions: user.permissions,
});
const toId = (id: string | null | undefined) =>
  id === null || id === undefined ? null : BigInt(id);

// The media library. Every signed-in user may browse and add; changing an
// item needs admin/editor or being its creator (domain checkCanManage).
@ApiTags("assets")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@RequirePermission("asset:upload", "asset:manage:any")
@Controller("assets")
export class AssetsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List a folder (root without folderId); q searches below it",
  })
  @ApiZodQuery(listAssetsSchema)
  @ApiZodResponse(assetListingSchema)
  async list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listAssetsSchema)) query: ListAssetsDto,
  ): Promise<AssetListing> {
    const { folderId, ...options } = query;
    const listing = await this.queries.execute(
      new ListAssetsQuery(toId(folderId), user.id, options, user),
    );
    if (!listing) {
      throw new AssetNotFoundError();
    }
    return listing;
  }

  @Get("folders")
  @ApiOperation({
    summary: "All folders, for move pickers",
  })
  @ApiZodResponse(folderOptionsSchema)
  folders(): Promise<FolderOption[]> {
    return this.queries.execute(new ListFoldersQuery());
  }

  @Get("by-path")
  @ApiOperation({
    summary: "Find an item by its full path",
  })
  @ApiZodQuery(byPathSchema)
  @ApiZodResponse(assetViewSchema)
  async byPath(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(byPathSchema)) query: ByPathDto,
  ): Promise<AssetView> {
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

  @Get(":id")
  @ApiOperation({
    summary: "Get an item",
  })
  @ApiZodResponse(assetViewSchema)
  show(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<AssetView> {
    return this.get(id, user);
  }

  @Post("folders")
  @ApiOperation({
    summary: "Create a folder",
  })
  @ApiZodBody(createFolderSchema)
  @ApiZodResponse(assetViewSchema, {
    status: 201,
  })
  @ApiFailResponse(409, "Name already used in this folder")
  async createFolder(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createFolderSchema)) body: CreateFolderDto,
  ): Promise<AssetView> {
    const id = await this.commands.execute(
      new CreateFolderCommand(
        toId(body.parentId),
        body.name,
        toActor(user),
        body.visibility,
      ),
    );
    return this.get(id, user);
  }

  @Post("links")
  @ApiOperation({
    summary: "Add a link to an external resource",
  })
  @ApiZodBody(createLinkSchema)
  @ApiZodResponse(assetViewSchema, {
    status: 201,
  })
  async createLink(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createLinkSchema)) body: CreateLinkDto,
  ): Promise<AssetView> {
    const id = await this.commands.execute(
      new CreateLinkCommand(
        toId(body.parentId),
        body.name,
        body.url,
        toActor(user),
      ),
    );
    return this.get(id, user);
  }

  @Post()
  @ApiOperation({
    summary: "Upload a file (png, jpeg, webp, gif, pdf; 20 MB)",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
        parentId: {
          type: "string",
        },
        visibility: {
          type: "string",
          enum: [
            "public",
            "private",
          ],
        },
      },
      required: [
        "file",
      ],
    },
  })
  @ApiZodResponse(assetViewSchema, {
    status: 201,
  })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: UPLOAD_LIMIT,
      },
    }),
  )
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedLibraryFile | undefined,
    @Body(new ZodValidationPipe(uploadSchema)) body: UploadDto,
  ): Promise<AssetView> {
    if (!file) {
      throw new BadRequestException("Missing file");
    }
    const id = await this.commands.execute(
      new UploadAssetCommand(
        file.buffer,
        file.originalname,
        LIBRARY_POLICY,
        body.visibility,
        toActor(user),
        toId(body.parentId),
      ),
    );
    return this.get(id, user);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Rename, change visibility, or change a link's URL",
  })
  @ApiZodBody(updateAssetSchema)
  @ApiZodResponse(assetViewSchema)
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(updateAssetSchema)) body: UpdateAssetDto,
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

  @Post(":id/move")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Move into a folder (parentId null: the root)",
  })
  @ApiZodBody(moveAssetSchema)
  @ApiZodResponse(assetViewSchema)
  async move(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(moveAssetSchema)) body: MoveAssetDto,
  ): Promise<AssetView> {
    await this.commands.execute(
      new MoveAssetCommand(id, toId(body.parentId), toActor(user)),
    );
    return this.get(id, user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete an item, and everything in it for a folder",
  })
  @ApiNoContentResponse()
  @ApiFailResponse(409, "Something in it is still in use")
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<void> {
    await this.commands.execute(new DeleteAssetCommand(id, toActor(user)));
  }

  // Private files through the short-lived signed link in AssetView.url.
  // Public: the signature is the authorization (ideas/storage).
  @Get(":id/content")
  @Public()
  @ApiExcludeEndpoint()
  async content(
    @Param("id", IdPipe) id: bigint,
    @Query(new ZodValidationPipe(signedContentSchema)) query: SignedContentDto,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.queries.execute(new GetSignedFileQuery(id, query));
    if (!file) {
      throw new AssetNotFoundError();
    }
    await sendFile(res, file, "private, no-store");
  }

  private async get(id: bigint, user: AuthUser): Promise<AssetView> {
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
