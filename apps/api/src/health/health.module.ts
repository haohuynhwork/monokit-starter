import { Module } from "@nestjs/common";
import { HealthChecks } from "./health.checks.js";
import { HealthController } from "./health.controller.js";

@Module({
  controllers: [
    HealthController,
  ],
  providers: [
    HealthChecks,
  ],
})
export class HealthModule {}
