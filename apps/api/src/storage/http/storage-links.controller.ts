import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Put,
  Query,
  Req,
  Res,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { Public } from "../../common/http/guards/auth.decorators.js";
import {
  InvalidStorageKeyError,
  StorageBodyLengthError,
  StorageSignedUrlError,
  StoredObjectNotFoundError,
} from "../domain/asset.errors.js";
import { STORAGE, type Storage } from "../domain/storage.js";
import {
  downloadFields,
  LocalStorage,
  uploadFields,
} from "../infrastructure/local.storage.js";
import type { LinkParams } from "../infrastructure/local-link-signer.js";

type LinkQuery = Partial<LinkParams> & {
  filename?: string;
  disposition?: string;
  contentType?: string;
  contentLength?: string;
};

// The local backend's signedUrl / signedUpload links (S3 signs its own).
// The signature is the only check: whoever holds the link may use it until
// it expires, as with an S3 presigned URL.
@ApiExcludeController()
@Public()
@Controller("storage")
export class StorageLinksController {
  constructor(@Inject(STORAGE) private readonly storage: Storage) {}

  @Get("*path")
  async download(
    @Param("path") path: string | string[],
    @Query() query: LinkQuery,
    @Res() res: Response,
  ): Promise<void> {
    const { local, key } = this.resolve(path);
    const fields = downloadFields({
      filename: query.filename,
      disposition: query.disposition,
    });
    await guard(() => local.signer.verify("GET", key, query, fields));
    const file = await guard(() => local.get(key));
    const name = fields.filename;
    res.set({
      "Content-Type": file.contentType ?? "application/octet-stream",
      "Content-Length": String(file.size),
      "Content-Disposition":
        name === undefined
          ? (file.contentDisposition ?? fields.disposition)
          : `${fields.disposition}; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      ETag: file.etag,
      "X-Content-Type-Options": "nosniff",
    });
    file.body.pipe(res);
  }

  @Put("*path")
  @HttpCode(HttpStatus.NO_CONTENT)
  async upload(
    @Param("path") path: string | string[],
    @Query() query: LinkQuery,
    @Req() req: Request,
  ): Promise<void> {
    const { local, key } = this.resolve(path);
    const contentType = query.contentType ?? "";
    await guard(() =>
      local.signer.verify(
        "PUT",
        key,
        query,
        uploadFields({
          contentType,
          contentLength: query.contentLength,
        }),
      ),
    );
    // The link is for exactly this type
    if (req.headers["content-type"] !== contentType) {
      throw new UnsupportedMediaTypeException(
        `This link takes ${contentType} only`,
      );
    }
    await guard(() =>
      local.put(key, req, {
        contentType,
        ...(query.contentLength !== undefined && {
          contentLength: Number(query.contentLength),
        }),
      }),
    );
  }

  private resolve(path: string | string[]): {
    local: LocalStorage;
    key: string;
  } {
    if (!(this.storage instanceof LocalStorage)) {
      throw new NotFoundException();
    }
    return {
      local: this.storage,
      key: Array.isArray(path) ? path.join("/") : path,
    };
  }
}

// Storage errors as HTTP errors
async function guard<T>(run: () => T | Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof StorageSignedUrlError) {
      throw new ForbiddenException(`Link ${error.reason}`);
    }
    if (
      error instanceof StoredObjectNotFoundError ||
      error instanceof InvalidStorageKeyError
    ) {
      throw new NotFoundException();
    }
    if (error instanceof StorageBodyLengthError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
