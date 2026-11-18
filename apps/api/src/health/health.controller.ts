import { readFileSync } from "node:fs";
import { Controller, Get, Logger, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { ApiError, ApiSuccess } from "@packages/contracts";
import type { Response } from "express";
import { Public } from "../common/http/guards/auth.decorators.js";
import { type CheckResult, HealthChecks } from "./health.checks.js";

// apps/api/package.json, next to dist/ (also in the Docker image)
const VERSION = readVersion();
const STARTED = new Date().toISOString();

// For load balancers, Docker and uptime monitors: public, no token.
// Liveness never touches dependencies, so a database outage doesn't get a
// healthy process restarted; readiness says whether to send it traffic.
@ApiTags("health")
@Public()
@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly checks: HealthChecks) {}

  @Get()
  @ApiOperation({
    summary: "Liveness: the process is up",
  })
  live(): {
    status: "ok";
    version: string;
    startedAt: string;
    uptimeSeconds: number;
  } {
    return {
      status: "ok",
      version: VERSION,
      startedAt: STARTED,
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  // Answered directly (not through the global interceptor/filter): a 503
  // still has to say which check failed, which the error filter hides
  @Get("ready")
  @ApiOperation({
    summary: "Readiness: database and storage reachable (503 if not)",
  })
  async ready(@Res() res: Response): Promise<void> {
    const [database, storage] = await Promise.all([
      this.checks.database(),
      this.checks.storage(),
    ]);
    const checks: Record<string, CheckResult> = {
      database,
      storage,
    };
    const failed = Object.entries(checks).filter(([, c]) => !c.ok);

    res.set("Cache-Control", "no-store");
    if (failed.length === 0) {
      const body: ApiSuccess<{
        status: "ok";
        checks: typeof checks;
      }> = {
        status: "success",
        data: {
          status: "ok",
          checks,
        },
      };
      res.status(200).json(body);
      return;
    }
    this.logger.warn(`Not ready: ${failed.map(([name]) => name).join(", ")}`);
    const body: ApiError<{
      checks: typeof checks;
    }> = {
      status: "error",
      code: "not_ready",
      message: `Not ready: ${failed.map(([name]) => name).join(", ")}`,
      data: {
        checks,
      },
    };
    res.status(503).json(body);
  }
}

function readVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as {
      version?: string;
    };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}
