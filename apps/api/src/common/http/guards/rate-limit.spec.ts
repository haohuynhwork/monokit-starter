import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import request from "supertest";
import { RateLimit, rateLimitOptions } from "./rate-limit.js";

@Controller()
class TestController {
  @Post("login")
  @HttpCode(200)
  @RateLimit(
    {
      limit: 3,
      ttl: 60_000,
    },
    {
      limit: 2,
      ttl: 60_000,
    },
  )
  login(@Body() _body: unknown): void {}

  @Get("open")
  open(): void {}
}

describe("RateLimit", () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot(rateLimitOptions),
      ],
      controllers: [
        TestController,
      ],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.set("trust proxy", "loopback");
    await app.init();
  });

  afterEach(() => app.close());

  const login = (ip: string, email: string) =>
    request(app.getHttpServer())
      .post("/login")
      .set("X-Forwarded-For", ip)
      .send({
        email,
      });

  it("limits each visitor address", async () => {
    for (const email of [
      "a@x.io",
      "b@x.io",
      "c@x.io",
    ]) {
      await login("1.1.1.1", email).expect(200);
    }
    await login("1.1.1.1", "d@x.io").expect(429);
    // Another visitor behind the same web server has its own count
    await login("2.2.2.2", "e@x.io").expect(200);
  });

  it("limits each account across addresses, case-insensitively", async () => {
    await login("1.1.1.1", "Same@x.io").expect(200);
    await login("2.2.2.2", " same@X.io ").expect(200);
    await login("3.3.3.3", "same@x.io").expect(429);
  });

  it("leaves routes without @RateLimit alone", async () => {
    for (let i = 0; i < 20; i++) {
      await request(app.getHttpServer()).get("/open").expect(200);
    }
  });
});
