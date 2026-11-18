import { Controller, Get, Param, Res } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiExcludeController } from "@nestjs/swagger";
import type { Response } from "express";
import { Public } from "../../common/http/guards/auth.decorators.js";
import { GetPublicFileQuery } from "../application/queries/get-public-file.query.js";
import { GetPublicLinkUrlQuery } from "../application/queries/get-public-link-url.query.js";
import { AssetNotFoundError } from "../domain/asset.errors.js";
import { sendFile } from "./send-file.js";

// What browsers load directly, through the web app (/serve/* forwarded
// as is): public files of the local backend by key (its public URL; S3
// would hand out its own), and public links, which redirect. Rich text
// references both as 'serve/<key>'.
@ApiExcludeController()
@Controller("serve")
export class ServeController {
  constructor(private readonly queries: QueryBus) {}

  @Get(":key")
  @Public()
  async byKey(@Param("key") key: string, @Res() res: Response): Promise<void> {
    // The public key (rich text); else the local backend's own URLs, which
    // name the storage key
    const file =
      (await this.queries.execute(
        new GetPublicFileQuery({
          key,
        }),
      )) ??
      (await this.queries.execute(
        new GetPublicFileQuery({
          storageKey: key,
        }),
      ));
    if (file) {
      // Keys never change content, so cache for a year
      await sendFile(res, file, "public, max-age=31536000, immutable");
      return;
    }
    // Links go to their URL, which may change
    const link = await this.queries.execute(new GetPublicLinkUrlQuery(key));
    if (!link) {
      throw new AssetNotFoundError();
    }
    res.setHeader("Cache-Control", "public, max-age=300");
    res.redirect(302, link);
  }
}
