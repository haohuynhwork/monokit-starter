import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";

export interface CheckResult {
  ok: boolean;
  ms: number;
  error?: string;
}

const TIMEOUT_MS = 2000;

// What readiness depends on. The only health code that touches the
// database or disk.
@Injectable()
export class HealthChecks {
  constructor(@InjectDb() private readonly db: Db) {}

  database(): Promise<CheckResult> {
    return timed(async () => {
      await this.db.query(
        this.db.raw.sql`SELECT 1 AS "ok"`
          .returnsRow({
            ok: "pg/int4@1",
          })
          .build(),
      );
    });
  }

  // LocalStorage writes under STORAGE_DIR; a read-only or full disk fails
  // uploads, so it fails readiness too
  storage(): Promise<CheckResult> {
    return timed(async () => {
      const dir = resolve(process.env.STORAGE_DIR ?? "storage");
      const probe = join(dir, `.health-${process.pid}`);
      await mkdir(dir, {
        recursive: true,
      });
      await writeFile(probe, "ok");
      await rm(probe, {
        force: true,
      });
    });
  }
}

// Runs a check with a time limit; never throws
async function timed(check: () => Promise<void>): Promise<CheckResult> {
  const started = performance.now();
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      check(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`timed out after ${TIMEOUT_MS} ms`)),
          TIMEOUT_MS,
        );
      }),
    ]);
    return {
      ok: true,
      ms: Math.round(performance.now() - started),
    };
  } catch (error) {
    return {
      ok: false,
      ms: Math.round(performance.now() - started),
      // Health endpoints are public: the kind of failure, not internals
      error:
        error instanceof Error && error.message.startsWith("timed out")
          ? error.message
          : "unavailable",
    };
  } finally {
    clearTimeout(timer);
  }
}
