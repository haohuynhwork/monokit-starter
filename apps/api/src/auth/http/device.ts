import type { Request } from "express";
import type { Device } from "../domain/session.js";

// The signing-in device, for REST and GraphQL alike
export function deviceOf(req: Request): Device {
  return {
    userAgent: req.headers["user-agent"] ?? null,
    ip: req.ip ?? null,
  };
}
