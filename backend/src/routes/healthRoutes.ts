import { Router } from "express";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import { ephemeralStore } from "../lib/ephemeralStore.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

export const healthRouter = Router();

healthRouter.get("/", asyncHandler(async (_req, res) => {
  let storage: Record<string, unknown>;
  try {
    if (env.storageMode === "ephemeral") {
      if (!ephemeralStore.probe()) throw new Error("SQLite probe failed");
      storage = { ...ephemeralStore.stats(), status: "up", probe: "SELECT 1" };
    } else {
      await prisma.$queryRaw`SELECT 1 AS ok`;
      storage = { mode: "mysql", status: "up", probe: "SELECT 1" };
    }
  } catch {
    throw new AppError(503, "STORAGE_UNAVAILABLE", "デモデータベースを利用できません");
  }
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      service: "keio-book-api",
      storage,
    },
    message: "healthy",
  });
}));
