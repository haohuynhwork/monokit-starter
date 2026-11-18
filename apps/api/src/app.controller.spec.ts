import { Test, TestingModule } from "@nestjs/testing";
import type { Request } from "express";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { API_PREFIX } from "./common/http/setup/api-prefix.js";

describe("AppController", () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [
        AppController,
      ],
      providers: [
        AppService,
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe("root", () => {
    const req = {
      protocol: "https",
      host: "cms.example.com",
    } as Request;
    const saved = process.env.PUBLIC_API_URL;
    afterEach(() => {
      process.env.PUBLIC_API_URL = saved;
    });

    it("points at the api, its docs and graphql as reached", () => {
      delete process.env.PUBLIC_API_URL;
      const api = `https://cms.example.com${API_PREFIX}`;
      expect(appController.index(req)).toEqual({
        api,
        docs: `${api}/docs`,
        graphql: `${api}/graphql`,
      });
    });

    it("prefers the configured PUBLIC_API_URL", () => {
      process.env.PUBLIC_API_URL = "https://api.example.com/";
      expect(appController.index(req).api).toBe(
        `https://api.example.com${API_PREFIX}`,
      );
    });
  });
});
