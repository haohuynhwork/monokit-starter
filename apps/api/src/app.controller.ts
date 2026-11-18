import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";
import { type ApiIndex, AppService } from "./app.service.js";
import { Public } from "./common/http/guards/auth.decorators.js";

// GET / stays unprefixed (the healthcheck) and points at the prefixed api
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  index(@Req() req: Request): ApiIndex {
    // The configured public origin; else as reached (protocol and host
    // honour X-Forwarded-* from trusted proxies)
    const origin =
      process.env.PUBLIC_API_URL?.replace(/\/+$/, "") ||
      `${req.protocol}://${req.host}`;
    return this.appService.index(origin);
  }
}
