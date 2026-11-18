import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module.js";
import { API_PREFIX } from "./common/http/setup/api-prefix.js";
import { setupSwagger } from "./common/http/setup/swagger.js";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // req.ip is the visitor: X-Forwarded-For is believed only from these
  // addresses (the web server, a reverse proxy). Default: loopback and
  // private networks (host dev, the compose network). Rate limits key on it.
  app.set("trust proxy", process.env.TRUST_PROXY || "loopback, uniquelocal");
  // Runs onApplicationShutdown (closes the db pool) on SIGTERM/SIGINT
  app.enableShutdownHooks();
  // req.cookies, for the auth cookies
  app.use(cookieParser());
  // GET / also answers at the prefix (/api, /api/), so clients that only
  // know the prefixed base URL can read it too
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.path === API_PREFIX || req.path === `${API_PREFIX}/`) {
      req.url = `/${req.url.slice(req.path.length)}`;
    }
    next();
  });
  app.setGlobalPrefix(API_PREFIX, {
    exclude: [
      "/",
    ],
  });
  setupSwagger(app);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
